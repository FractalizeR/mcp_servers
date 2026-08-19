/**
 * Contract Tests для ToolRegistry
 *
 * Цель: Зафиксировать инварианты поведения ToolRegistry ПЕРЕД рефакторингом
 * Если эти тесты проходят после рефакторинга → регрессии нет
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolRegistry, type ToolConstructor } from '../src/tool-registry/index.js';
import { BaseTool } from '../src/tools/base/base-tool.js';
import type { Container } from 'inversify';
import type { Logger, ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import {
  ToolCategory,
  ToolPriority,
  type StaticToolMetadata,
  type ToolDefinition,
} from '../src/tools/base/index.js';

// Mock tool для тестирования
class MockTool extends BaseTool<void> {
  static override METADATA: StaticToolMetadata = {
    name: 'tool1',
    description: 'Mock tool',
    category: ToolCategory.SYSTEM,
    subcategory: 'mock',
    priority: ToolPriority.NORMAL,
    tags: [],
    isHelper: false,
  };

  constructor(
    private readonly name: string,
    logger: Logger
  ) {
    // BaseTool expects facade, but we don't need it for mock
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    super(null as any, logger);
  }

  override getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: `Mock tool ${this.name}`,
      inputSchema: {
        type: 'object' as const,
        properties: {},
        required: [],
      },
    };
  }

  override async execute(_params: ToolCallParams): Promise<ToolResult> {
    return {
      content: [{ type: 'text', text: `Mock result from ${this.name}` }],
      isError: false,
    };
  }
}

// Mock tool с priority
class CriticalMockTool extends MockTool {
  static override METADATA: StaticToolMetadata = {
    ...MockTool.METADATA,
    priority: ToolPriority.CRITICAL,
  };
}

class HighPriorityMockTool extends MockTool {
  static override METADATA: StaticToolMetadata = {
    ...MockTool.METADATA,
    priority: ToolPriority.HIGH,
  };
}

class LowPriorityMockTool extends MockTool {
  static override METADATA: StaticToolMetadata = {
    ...MockTool.METADATA,
    priority: ToolPriority.LOW,
  };
}

// Mock tool с другой категорией
class OtherCategoryMockTool extends MockTool {
  static override METADATA: StaticToolMetadata = {
    ...MockTool.METADATA,
    category: ToolCategory.HELPERS,
  };
}

describe('ToolRegistry - Contract Tests', () => {
  let mockLogger: Logger;
  let mockContainer: Container;
  let toolInstances: Map<string, BaseTool>;

  beforeEach(() => {
    // Mock logger
    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn(() => mockLogger),
    } as unknown as Logger;

    // Mock container - сопоставляем класс → instance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const classToInstance = new Map<any, BaseTool>();

    // Mock container
    mockContainer = {
      get: vi.fn((symbol: symbol) => {
        // Ищем по Symbol.for(ClassName)
        const instance = classToInstance.get(symbol);
        if (instance) {
          return instance;
        }

        // Fallback: пытаемся создать по имени символа
        const symbolStr = symbol.toString();
        if (
          symbolStr.includes('MockTool') &&
          !symbolStr.includes('Critical') &&
          !symbolStr.includes('High') &&
          !symbolStr.includes('Low') &&
          !symbolStr.includes('OtherCategory')
        ) {
          const tool = new MockTool('tool1', mockLogger);
          classToInstance.set(symbol, tool);
          return tool;
        }
        if (symbolStr.includes('CriticalMockTool')) {
          const tool = new CriticalMockTool('critical_tool', mockLogger);
          classToInstance.set(symbol, tool);
          return tool;
        }
        if (symbolStr.includes('HighPriorityMockTool')) {
          const tool = new HighPriorityMockTool('high_tool', mockLogger);
          classToInstance.set(symbol, tool);
          return tool;
        }
        if (symbolStr.includes('LowPriorityMockTool')) {
          const tool = new LowPriorityMockTool('low_tool', mockLogger);
          classToInstance.set(symbol, tool);
          return tool;
        }
        if (symbolStr.includes('OtherCategoryMockTool')) {
          const tool = new OtherCategoryMockTool('other_tool', mockLogger);
          classToInstance.set(symbol, tool);
          return tool;
        }
        if (symbolStr.includes('ToolA')) {
          const tool = new (class ToolA extends MockTool {
            static override METADATA: StaticToolMetadata = { ...MockTool.METADATA };
          })('a_tool', mockLogger);
          classToInstance.set(symbol, tool);
          return tool;
        }
        if (symbolStr.includes('ToolB')) {
          const tool = new (class ToolB extends MockTool {
            static override METADATA: StaticToolMetadata = { ...MockTool.METADATA };
          })('z_tool', mockLogger);
          classToInstance.set(symbol, tool);
          return tool;
        }
        if (symbolStr.includes('extra_tool')) {
          const tool = new MockTool('extra_tool', mockLogger);
          classToInstance.set(symbol, tool);
          return tool;
        }

        throw new Error(`Unknown symbol: ${symbolStr}`);
      }),
    } as unknown as Container;

    toolInstances = new Map(); // Не нужен больше
  });

  describe('Инвариант 1: Регистрация инструментов', () => {
    it('register(tool) добавляет инструменты в registry при инициализации', () => {
      const registry = new ToolRegistry(mockContainer, mockLogger, [
        MockTool as unknown as ToolConstructor,
        CriticalMockTool as unknown as ToolConstructor,
      ]);

      const definitions = registry.getDefinitions();

      expect(definitions.length).toBe(2);
      expect(definitions.map((d) => d.name)).toContain('tool1');
      expect(definitions.map((d) => d.name)).toContain('critical_tool');
    });
  });

  describe('Инвариант 2: Получение всех инструментов', () => {
    it('getDefinitions() возвращает все зарегистрированные tools', () => {
      const registry = new ToolRegistry(mockContainer, mockLogger, [
        MockTool as unknown as ToolConstructor,
        CriticalMockTool as unknown as ToolConstructor,
        HighPriorityMockTool as unknown as ToolConstructor,
      ]);

      const definitions = registry.getDefinitions();

      expect(definitions.length).toBe(3);
      expect(definitions.every((d) => d.name && d.description && d.inputSchema)).toBe(true);
    });

    it('getAllTools() возвращает все BaseTool instances', () => {
      const registry = new ToolRegistry(mockContainer, mockLogger, [
        MockTool as unknown as ToolConstructor,
      ]);

      const tools = registry.getAllTools();

      expect(tools.length).toBe(1);
      expect(tools[0]).toBeInstanceOf(BaseTool);
    });
  });

  describe('Инвариант 3: Сортировка по priority', () => {
    it('getDefinitions() возвращает tools отсортированные: critical → high → normal → low', () => {
      const registry = new ToolRegistry(mockContainer, mockLogger, [
        MockTool as unknown as ToolConstructor, // normal
        LowPriorityMockTool as unknown as ToolConstructor, // low
        HighPriorityMockTool as unknown as ToolConstructor, // high
        CriticalMockTool as unknown as ToolConstructor, // critical
      ]);

      const definitions = registry.getDefinitions();

      const names = definitions.map((d) => d.name);

      // Проверяем порядок: critical первым, low последним
      expect(names[0]).toBe('critical_tool');
      expect(names[1]).toBe('high_tool');
      expect(names[names.length - 1]).toBe('low_tool');
    });

    it('сортировка по алфавиту внутри одного priority', () => {
      // Создаем два tool с одинаковым priority
      class ToolA extends MockTool {
        static override METADATA: StaticToolMetadata = { ...MockTool.METADATA };
      }
      class ToolB extends MockTool {
        static override METADATA: StaticToolMetadata = { ...MockTool.METADATA };
      }

      toolInstances.set('a_tool', new ToolA('a_tool', mockLogger));
      toolInstances.set('z_tool', new ToolB('z_tool', mockLogger));

      const registry = new ToolRegistry(mockContainer, mockLogger, [
        ToolA as unknown as ToolConstructor,
        ToolB as unknown as ToolConstructor,
      ]);

      const definitions = registry.getDefinitions();
      const names = definitions.map((d) => d.name);

      expect(names[0]).toBe('a_tool');
      expect(names[1]).toBe('z_tool');
    });
  });

  describe('Инвариант 4: Негативный фильтр (disabled groups)', () => {
    it('disabledFilter исключает инструменты отключенной категории', () => {
      const registry = new ToolRegistry(mockContainer, mockLogger, [
        MockTool as unknown as ToolConstructor, // category: system
        OtherCategoryMockTool as unknown as ToolConstructor, // category: helpers
      ]);

      const definitions = registry.getDefinitions({
        includeAll: false,
        categories: new Set([ToolCategory.SYSTEM]),
        categoriesWithSubcategories: new Map(),
      });

      expect(definitions.length).toBe(1);
      expect(definitions[0]?.name).toBe('other_tool');
    });

    it('без disabledFilter возвращает все tools (эквивалентно getDefinitions())', () => {
      const registry = new ToolRegistry(mockContainer, mockLogger, [
        MockTool as unknown as ToolConstructor,
        OtherCategoryMockTool as unknown as ToolConstructor,
      ]);

      const definitions = registry.getDefinitions();

      expect(definitions.length).toBe(2);
    });
  });

  describe('Инвариант 5: Детерминированный порядок tools/list (контракт)', () => {
    it('два последовательных вызова getDefinitions() дают побайтово одинаковый список', () => {
      const registry = new ToolRegistry(mockContainer, mockLogger, [
        MockTool as unknown as ToolConstructor,
        CriticalMockTool as unknown as ToolConstructor,
        HighPriorityMockTool as unknown as ToolConstructor,
        LowPriorityMockTool as unknown as ToolConstructor,
        OtherCategoryMockTool as unknown as ToolConstructor,
      ]);

      const first = registry.getDefinitions();
      const second = registry.getDefinitions();

      expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    });

    it('сортировка полная: приоритет первым ключом, имя — обязательный tie-breaker', () => {
      // ToolA → 'a_tool', ToolB → 'z_tool' (см. classToInstance fallback в
      // beforeEach), оба priority: normal — порядок внутри одного приоритета
      // не должен зависеть от порядка регистрации в DI.
      class ToolA extends MockTool {
        static override METADATA: StaticToolMetadata = { ...MockTool.METADATA };
      }
      class ToolB extends MockTool {
        static override METADATA: StaticToolMetadata = { ...MockTool.METADATA };
      }

      // Регистрируем в "неправильном" порядке (B раньше A) — сортировка должна
      // всё равно поставить a_tool раньше z_tool.
      const registry = new ToolRegistry(mockContainer, mockLogger, [
        ToolB as unknown as ToolConstructor,
        ToolA as unknown as ToolConstructor,
      ]);

      const names = registry.getDefinitions().map((d) => d.name);
      expect(names).toEqual(['a_tool', 'z_tool']);
    });
  });

  describe('Инвариант 6: Получение tool по имени', () => {
    it('getTool(name) возвращает tool по exact name', () => {
      const registry = new ToolRegistry(mockContainer, mockLogger, [
        MockTool as unknown as ToolConstructor,
      ]);

      const tool = registry.getTool('tool1');

      expect(tool).toBeDefined();
      expect(tool?.getDefinition().name).toBe('tool1');
    });

    it('getTool(name) возвращает undefined для несуществующего tool', () => {
      const registry = new ToolRegistry(mockContainer, mockLogger, [
        MockTool as unknown as ToolConstructor,
      ]);

      const tool = registry.getTool('nonexistent');

      expect(tool).toBeUndefined();
    });
  });

  describe('Инвариант 7: Выполнение tool', () => {
    it('execute(name, params) вызывает tool.execute()', async () => {
      const registry = new ToolRegistry(mockContainer, mockLogger, [
        MockTool as unknown as ToolConstructor,
      ]);

      const result = await registry.execute('tool1', {});

      expect(result.isError).toBe(false);
      expect(result.content[0]?.text).toContain('Mock result from tool1');
    });

    it('execute(name) возвращает ошибку для несуществующего tool', async () => {
      const registry = new ToolRegistry(mockContainer, mockLogger, [
        MockTool as unknown as ToolConstructor,
      ]);

      const result = await registry.execute('nonexistent', {});

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('не найден');
    });
  });

  describe('Инвариант 8: Lazy initialization', () => {
    it('tools не инициализированы при создании registry', () => {
      new ToolRegistry(mockContainer, mockLogger, [MockTool as unknown as ToolConstructor]);

      // container.get() не должен быть вызван
      expect(mockContainer.get).not.toHaveBeenCalled();
    });

    it('tools инициализируются при первом вызове getDefinitions()', () => {
      const registry = new ToolRegistry(mockContainer, mockLogger, [
        MockTool as unknown as ToolConstructor,
      ]);

      registry.getDefinitions();

      // Теперь container.get() должен быть вызван
      expect(mockContainer.get).toHaveBeenCalled();
    });
  });

  describe('Инвариант 9: Дополнительная регистрация', () => {
    it('registerToolFromContainer() добавляет tool после инициализации', () => {
      const registry = new ToolRegistry(mockContainer, mockLogger, [
        MockTool as unknown as ToolConstructor,
      ]);

      // Сначала инициализируем
      registry.getDefinitions();

      // Добавляем дополнительный tool
      registry.registerToolFromContainer('extra_tool');

      const definitions = registry.getDefinitions();

      expect(definitions.length).toBe(2);
      expect(definitions.map((d) => d.name)).toContain('extra_tool');
    });
  });

  describe('Инвариант 10: Пустой registry', () => {
    it('getDefinitions() на пустом registry возвращает []', () => {
      const registry = new ToolRegistry(mockContainer, mockLogger, []);

      const definitions = registry.getDefinitions();

      expect(definitions).toEqual([]);
    });

    it('getAllTools() на пустом registry возвращает []', () => {
      const registry = new ToolRegistry(mockContainer, mockLogger, []);

      const tools = registry.getAllTools();

      expect(tools).toEqual([]);
    });
  });
});
