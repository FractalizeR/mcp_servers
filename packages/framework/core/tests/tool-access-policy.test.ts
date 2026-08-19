/**
 * Тесты для ToolAccessPolicy — единый источник истины о доступности инструмента
 *
 * Контекст (пакет 1.1.A плана модернизации, .agentic-planning/plan_mcp_2026_modernization/
 * 1.1_defects_sequential.md): `tools/list` фильтрует набор инструментов
 * (ToolFilterService), а `ToolRegistry.execute()` раньше доставал tool из полной карты
 * БЕЗ проверки — скрытый/отключённый через конфигурацию tool можно было вызвать напрямую.
 *
 * Эти тесты изолированно (без DI-контейнера сервера) проверяют:
 * - execute() отказывает в вызове tool, отсутствующего в tools/list (DoD #1);
 * - normalize-then-check порядок гарантирует одинаковый вердикт для имени с префиксом
 *   сервера и без него (DoD #2) — воспроизведено на уровне ToolRegistry, т.к. сама
 *   normalize-логика (снятие префикса) специфична для каждого сервера и живёт в его
 *   server.ts/handlers.ts (см. дополнительно integration-тест в пакете yandex-tracker:
 *   tests/composition-root/tool-access-policy.test.ts);
 * - текст отказа не раскрывает имена других инструментов (DoD #3).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Container } from 'inversify';
import type { Logger, ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { ToolRegistry, type ToolConstructor } from '../src/tool-registry/index.js';
import {
  ConfiguredToolAccessPolicy,
  AllowAllToolAccessPolicy,
} from '../src/tool-registry/tool-access-policy.js';
import { ToolFilterService } from '../src/tool-registry/tool-filter.service.js';
import { BaseTool } from '../src/tools/base/base-tool.js';
import {
  ToolCategory,
  ToolPriority,
  type StaticToolMetadata,
  type ToolDefinition,
} from '../src/tools/base/index.js';

class MockTool extends BaseTool<void> {
  static override METADATA: StaticToolMetadata = {
    name: 'mock_tool',
    description: 'Mock tool',
    category: ToolCategory.ISSUES,
    subcategory: 'read',
    priority: ToolPriority.NORMAL,
    tags: [],
    isHelper: false,
  };

  constructor(
    private readonly name: string,
    logger: Logger
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    super(null as any, logger);
  }

  override getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: `Mock tool ${this.name}`,
      inputSchema: { type: 'object' as const, properties: {}, required: [] },
    };
  }

  override async execute(_params: ToolCallParams): Promise<ToolResult> {
    return {
      content: [{ type: 'text', text: `Mock result from ${this.name}` }],
      isError: false,
    };
  }
}

class DisabledCategoryMockTool extends MockTool {
  static override METADATA: StaticToolMetadata = { ...MockTool.METADATA };
}

class AllowedCategoryMockTool extends MockTool {
  static override METADATA: StaticToolMetadata = {
    ...MockTool.METADATA,
    category: ToolCategory.SYSTEM,
  };
}

function buildMockContainer(): Container {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const classToInstance = new Map<any, BaseTool>();
  const mockLogger: Logger = {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  (mockLogger.child as ReturnType<typeof vi.fn>).mockReturnValue(mockLogger);

  return {
    get: vi.fn((symbol: symbol) => {
      const cached = classToInstance.get(symbol);
      if (cached) {
        return cached;
      }

      const symbolStr = symbol.toString();
      let instance: BaseTool | undefined;

      if (symbolStr.includes('DisabledCategoryMockTool')) {
        instance = new DisabledCategoryMockTool('disabled_tool', mockLogger);
      } else if (symbolStr.includes('AllowedCategoryMockTool')) {
        instance = new AllowedCategoryMockTool('allowed_tool', mockLogger);
      }

      if (!instance) {
        throw new Error(`Unknown symbol: ${symbolStr}`);
      }

      classToInstance.set(symbol, instance);
      return instance;
    }),
  } as unknown as Container;
}

const mockLoggerForRegistry: Logger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(() => mockLoggerForRegistry),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

describe('ConfiguredToolAccessPolicy', () => {
  it('isVisible/isCallable === false для tool из отключённой категории (disabledFilter)', () => {
    const policy = new ConfiguredToolAccessPolicy({
      includeAll: false,
      categories: new Set(['issues']),
      categoriesWithSubcategories: new Map(),
    });

    const disabledTool = new DisabledCategoryMockTool('disabled_tool', mockLoggerForRegistry);
    expect(policy.isVisible(disabledTool)).toBe(false);
    expect(policy.isCallable(disabledTool)).toBe(false);
  });

  it('isVisible/isCallable === true для tool вне отключённой категории', () => {
    const policy = new ConfiguredToolAccessPolicy({
      includeAll: false,
      categories: new Set(['issues']),
      categoriesWithSubcategories: new Map(),
    });

    const allowedTool = new AllowedCategoryMockTool('allowed_tool', mockLoggerForRegistry);
    expect(policy.isVisible(allowedTool)).toBe(true);
    expect(policy.isCallable(allowedTool)).toBe(true);
  });

  it('denialReason() не содержит других имён — вызывающий должен сам передать проверяемое имя', () => {
    const policy = new ConfiguredToolAccessPolicy(undefined);
    const text = policy.denialReason('some_tool');
    expect(text).toContain('some_tool');
    expect(text).not.toContain('other_tool');
  });

  it('использует ЕДИНУЮ логику с ToolFilterService (один и тот же предикат)', () => {
    const disabledFilter = {
      includeAll: false,
      categories: new Set(['issues']),
      categoriesWithSubcategories: new Map(),
    };
    const policy = new ConfiguredToolAccessPolicy(disabledFilter);
    const tool = new DisabledCategoryMockTool('disabled_tool', mockLoggerForRegistry);

    expect(policy.isVisible(tool)).toBe(
      !ToolFilterService.isDisabledByFilter(tool, disabledFilter)
    );
  });
});

describe('AllowAllToolAccessPolicy', () => {
  it('разрешает всё по умолчанию (для тестов и серверов без access control)', () => {
    const policy = new AllowAllToolAccessPolicy();
    const tool = new DisabledCategoryMockTool('disabled_tool', mockLoggerForRegistry);
    expect(policy.isVisible(tool)).toBe(true);
    expect(policy.isCallable(tool)).toBe(true);
  });
});

const DISABLED_ISSUES_FILTER = {
  includeAll: false,
  categories: new Set(['issues']),
  categoriesWithSubcategories: new Map<string, Set<string>>(),
};

function makeRegistryWithBothTools(container: Container): ToolRegistry {
  const accessPolicy = new ConfiguredToolAccessPolicy(DISABLED_ISSUES_FILTER);
  return new ToolRegistry(
    container,
    mockLoggerForRegistry,
    [
      DisabledCategoryMockTool as unknown as ToolConstructor,
      AllowedCategoryMockTool as unknown as ToolConstructor,
    ],
    accessPolicy
  );
}

describe('ToolRegistry.execute() — граница доступа (единый источник истины с tools/list)', () => {
  let container: Container;

  beforeEach(() => {
    container = buildMockContainer();
  });

  it('DoD 1.1.A#1: tool, отсутствующий в tools/list (disabledFilter), получает отказ при tools/call', async () => {
    const registry = makeRegistryWithBothTools(container);

    // Подтверждаем, что disabled_tool действительно отсутствует в tools/list
    const definitions = registry.getDefinitions(DISABLED_ISSUES_FILTER);
    expect(definitions.find((d) => d.name === 'disabled_tool')).toBeUndefined();

    // ...и прямой tools/call для него получает отказ, а не выполнение
    const result = await registry.execute('disabled_tool', {});
    expect(result.isError).toBe(true);
    const text = result.content[0]?.type === 'text' ? result.content[0].text : '';
    expect(text).toContain('недоступен');
    expect(text).not.toContain('Mock result from disabled_tool');
  });

  it('tool вне disabledFilter продолжает исполняться штатно', async () => {
    const registry = makeRegistryWithBothTools(container);

    const result = await registry.execute('allowed_tool', {});
    expect(result.isError).toBe(false);
    expect(result.content[0]?.type === 'text' && result.content[0].text).toContain(
      'Mock result from allowed_tool'
    );
  });

  it('DoD 1.1.A#2: normalize-then-check — одинаковое имя (после нормализации) даёт одинаковый вердикт', async () => {
    // Нормализация имени (снятие префикса сервера) — ответственность вызывающей стороны
    // (server.ts), выполняется ДО обращения к ToolRegistry.execute(). ToolRegistry всегда
    // работает с уже нормализованными (bare) именами — это гарантирует, что policy не может
    // увидеть два разных представления одного и того же tool.
    const registry = makeRegistryWithBothTools(container);

    const normalize = (rawName: string): string =>
      rawName.startsWith('some_server:') ? rawName.slice('some_server:'.length) : rawName;

    const resultFromPrefixed = await registry.execute(normalize('some_server:disabled_tool'), {});
    const resultFromBare = await registry.execute(normalize('disabled_tool'), {});

    expect(resultFromPrefixed).toEqual(resultFromBare);
  });

  it('DoD 1.1.A#3: текст отказа не содержит имена других зарегистрированных инструментов', async () => {
    const registry = makeRegistryWithBothTools(container);

    const result = await registry.execute('disabled_tool', {});
    const text = result.content[0]?.type === 'text' ? result.content[0].text : '';

    expect(text).not.toContain('allowed_tool');
    expect(text).not.toContain('availableTools');
    expect(text).not.toContain('similarTools');
  });
});

describe('ToolRegistry.getVisibleDefinitions() — единый объект accessPolicy с execute() (пакет 4.1.B)', () => {
  let container: Container;

  beforeEach(() => {
    container = buildMockContainer();
  });

  it('фильтрует ТЕМ ЖЕ accessPolicy, что использует execute() — disabled_tool отсутствует', () => {
    const registry = makeRegistryWithBothTools(container);

    const visible = registry.getVisibleDefinitions();

    expect(visible.find((d) => d.name === 'disabled_tool')).toBeUndefined();
    expect(visible.find((d) => d.name === 'allowed_tool')).toBeDefined();
  });

  it('не принимает disabledFilter параметром — единственный источник видимости это accessPolicy конструктора', () => {
    const registry = makeRegistryWithBothTools(container);

    // Сигнатура метода не берёт фильтр: видимость целиком определяется
    // accessPolicy, переданной в конструктор ToolRegistry, а не параметром
    // вызова — это и есть устранение разделения (см. tool-registry.ts).
    expect(registry.getVisibleDefinitions.length).toBe(0);
  });

  it('без accessPolicy (AllowAllToolAccessPolicy по умолчанию) возвращает все tools', () => {
    const accessPolicy = new AllowAllToolAccessPolicy();
    const registry = new ToolRegistry(
      container,
      mockLoggerForRegistry,
      [
        DisabledCategoryMockTool as unknown as ToolConstructor,
        AllowedCategoryMockTool as unknown as ToolConstructor,
      ],
      accessPolicy
    );

    const visible = registry.getVisibleDefinitions();
    expect(visible.map((d) => d.name).sort()).toEqual(['allowed_tool', 'disabled_tool']);
  });

  it('два последовательных вызова дают побайтово одинаковый список (тот же контракт порядка, что у getDefinitions)', () => {
    const registry = makeRegistryWithBothTools(container);

    const first = registry.getVisibleDefinitions();
    const second = registry.getVisibleDefinitions();

    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });
});
