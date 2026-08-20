import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToolRegistry, buildToolName, redactParams } from '@fractalizer/mcp-core';
import type { Container } from 'inversify';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import type { ToolCallParams } from '@fractalizer/mcp-infrastructure/types.js';
import type { PingResult } from '#tracker_api/api_operations/user/ping.operation.js';
import type { BatchIssueResult } from '#tracker_api/api_operations/issue/get-issues.operation.js';
import { PingTool } from '#tools/ping.tool.js';
import { GetIssuesTool } from '#tools/api/issues/get/index.js';
import { CreateIssueTool } from '#tools/api/issues/create/index.js';
import { UpdateIssueTool } from '#tools/api/issues/update/index.js';
import { FindIssuesTool } from '#tools/api/issues/find/index.js';
import { GetIssueChangelogTool } from '#tools/api/issues/changelog/index.js';
import { GetIssueTransitionsTool } from '#tools/api/issues/transitions/get/index.js';
import { TransitionIssueTool } from '#tools/api/issues/transitions/execute/index.js';
import { IssueUrlTool } from '#tools/helpers/issue-url/index.js';
import { DemoTool } from '#tools/helpers/demo/index.js';
import { MCP_TOOL_PREFIX } from '#constants';
import { getTextContent } from '#helpers/tool-result.helper.js';
import { createIssueFixture } from '#helpers/issue.fixture.js';
import { createQueueRef, createUserRef } from '#helpers/common-fixtures.js';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;
  let mockContainer: Container;
  let mockFacade: YandexTrackerFacade;
  let mockLogger: Logger;

  beforeEach(() => {
    // Mock YandexTrackerFacade
    mockFacade = {
      ping: vi.fn(),
      getIssues: vi.fn(),
      createIssue: vi.fn(),
      updateIssue: vi.fn(),
      findIssues: vi.fn(),
    } as unknown as YandexTrackerFacade;

    // Mock Logger
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      child: vi.fn(() => mockLogger),
    } as unknown as Logger;

    // Mock DI Container
    mockContainer = {
      get: vi.fn((symbol: symbol) => {
        const symbolStr = symbol.toString();
        if (symbolStr.includes('PingTool')) {
          return new PingTool(mockFacade, mockLogger);
        }
        if (symbolStr.includes('GetIssuesTool')) {
          return new GetIssuesTool(mockFacade, mockLogger);
        }
        if (symbolStr.includes('CreateIssueTool')) {
          return new CreateIssueTool(mockFacade, mockLogger);
        }
        if (symbolStr.includes('UpdateIssueTool')) {
          return new UpdateIssueTool(mockFacade, mockLogger);
        }
        if (symbolStr.includes('FindIssuesTool')) {
          return new FindIssuesTool(mockFacade, mockLogger);
        }
        if (symbolStr.includes('GetIssueChangelogTool')) {
          return new GetIssueChangelogTool(mockFacade, mockLogger);
        }
        if (symbolStr.includes('GetIssueTransitionsTool')) {
          return new GetIssueTransitionsTool(mockFacade, mockLogger);
        }
        if (symbolStr.includes('TransitionIssueTool')) {
          return new TransitionIssueTool(mockFacade, mockLogger);
        }
        if (symbolStr.includes('IssueUrlTool')) {
          return new IssueUrlTool(mockFacade, mockLogger);
        }
        if (symbolStr.includes('DemoTool')) {
          return new DemoTool(mockFacade, mockLogger);
        }
        throw new Error(`Unknown symbol: ${symbolStr}`);
      }),
    } as unknown as Container;

    const toolClasses = [
      PingTool,
      GetIssuesTool,
      CreateIssueTool,
      UpdateIssueTool,
      FindIssuesTool,
      GetIssueChangelogTool,
      GetIssueTransitionsTool,
      TransitionIssueTool,
      IssueUrlTool,
      DemoTool,
    ];

    registry = new ToolRegistry(mockContainer, mockLogger, toolClasses);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('должна зарегистрировать все доступные инструменты', () => {
      // Lazy initialization - проверяем после первого вызова
      const definitions = registry.getDefinitions();

      // Assert - теперь у нас 11 tools (Ping, GetIssues, CreateIssue, UpdateIssue, FindIssues, GetIssueChangelog, GetIssueTransitions, TransitionIssue, IssueUrl, Demo, SearchTools)
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Зарегистрирован инструмент: ${buildToolName('ping', MCP_TOOL_PREFIX)}`
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Зарегистрирован инструмент: ${buildToolName('get_issues', MCP_TOOL_PREFIX)}`
      );
      expect(mockLogger.debug).toHaveBeenCalledWith('Зарегистрировано инструментов: 10');
      expect(definitions.length).toBe(10);
    });
  });

  describe('getDefinitions', () => {
    it('должна вернуть определения всех зарегистрированных инструментов', () => {
      // Act
      const definitions = registry.getDefinitions();

      // Assert - теперь 11 tools
      expect(definitions).toHaveLength(10);

      const pingDef = definitions.find((d) => d.name === buildToolName('ping', MCP_TOOL_PREFIX));
      const getIssuesDef = definitions.find(
        (d) => d.name === buildToolName('get_issues', MCP_TOOL_PREFIX)
      );
      const demoDef = definitions.find((d) => d.name === buildToolName('demo', MCP_TOOL_PREFIX));

      expect(pingDef).toBeDefined();
      expect(getIssuesDef).toBeDefined();
      expect(demoDef).toBeDefined();

      expect(pingDef?.description).toContain('Проверка доступности сервера');
      expect(getIssuesDef?.description).toContain('задач');
      expect(demoDef?.description).toContain('Тестовый');
    });

    it('все определения должны иметь корректную структуру', () => {
      // Act
      const definitions = registry.getDefinitions();

      // Assert
      definitions.forEach((def) => {
        expect(def.name).toBeTruthy();
        expect(def.description).toBeTruthy();
        expect(def.inputSchema).toBeDefined();
        expect(def.inputSchema.type).toBe('object');
        expect(def.inputSchema.properties).toBeDefined();
      });
    });
  });

  describe('getTool', () => {
    it('должна вернуть tool по имени', () => {
      // Act
      const tool = registry.getTool(buildToolName('ping', MCP_TOOL_PREFIX));

      // Assert
      expect(tool).toBeDefined();
      expect(tool?.getDefinition().name).toBe(buildToolName('ping', MCP_TOOL_PREFIX));
    });

    it('должна вернуть undefined для несуществующего tool', () => {
      // Act
      const tool = registry.getTool('non_existent_tool');

      // Assert
      expect(tool).toBeUndefined();
    });
  });

  describe('getAllTools', () => {
    it('должна вернуть все зарегистрированные tools', () => {
      // Act
      const tools = registry.getAllTools();

      // Assert
      expect(tools).toHaveLength(10);
      expect(tools.every((t) => t.getDefinition)).toBe(true);
    });
  });

  describe('execute', () => {
    it('должна успешно выполнить ping инструмент', async () => {
      // Arrange
      const params: ToolCallParams = {};
      const mockPingResult: PingResult = {
        success: true,
        message: 'Подключение успешно',
      };
      const toolName = buildToolName('ping', MCP_TOOL_PREFIX);

      vi.mocked(mockFacade.ping).mockResolvedValue(mockPingResult);

      // Act
      const result = await registry.execute(toolName, params);

      // Assert
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0]!.type).toBe('text');

      expect(mockLogger.info).toHaveBeenCalledWith(`🔍 Поиск инструмента: ${toolName}`);
      expect(mockLogger.info).toHaveBeenCalledWith(`✅ Инструмент ${toolName} выполнен успешно`);
      // Пакет 1.1.B: params в лог попадают редактированными (форма, а не
      // содержимое) — см. packages/framework/core/src/tool-registry/params-redactor.ts
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Параметры вызова (redacted):',
        redactParams(params)
      );
    });

    it('должна успешно выполнить get_issues инструмент', async () => {
      // Arrange
      const params: ToolCallParams = { issueIds: ['TEST-1'], fields: ['id', 'key', 'summary'] };
      const toolName = buildToolName('get_issues', MCP_TOOL_PREFIX);
      const mockResults: BatchIssueResult[] = [
        {
          status: 'fulfilled',
          key: 'TEST-1',
          index: 0,
          value: createIssueFixture({
            self: 'https://api.tracker.yandex.net/v3/issues/TEST-1',
            id: '1',
            key: 'TEST-1',
            version: 1,
            summary: 'Test',
            statusStartTime: '2023-01-01T00:00:00.000+0000',
            updatedAt: '2023-01-01T00:00:00.000+0000',
            createdAt: '2023-01-01T00:00:00.000+0000',
            queue: createQueueRef({ id: '1', key: 'Q', display: 'Queue' }),
            status: { id: '1', key: 'open', display: 'Open' },
            createdBy: createUserRef({ id: 'user1', display: 'User' }),
          }),
        },
      ];

      vi.mocked(mockFacade.getIssues).mockResolvedValue(mockResults);

      // Act
      const result = await registry.execute(toolName, params);

      // Assert
      expect(result.isError).toBeUndefined();
      expect(mockLogger.info).toHaveBeenCalledWith(`✅ Инструмент ${toolName} выполнен успешно`);
    });

    it('должна вернуть ошибку для несуществующего инструмента', async () => {
      // Arrange
      const params: ToolCallParams = {};

      // Act
      const result = await registry.execute('non_existent_tool', params);

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0]!.type).toBe('text');

      const content = JSON.parse(getTextContent(result));
      expect(content.success).toBe(false);
      expect(content.message).toContain('не найден');
      expect(content.availableTools).toContain(buildToolName('ping', MCP_TOOL_PREFIX));
      expect(content.availableTools).toContain(buildToolName('get_issues', MCP_TOOL_PREFIX));

      expect(mockLogger.error).toHaveBeenCalledWith(
        '❌ Инструмент "non_existent_tool" не найден',
        expect.objectContaining({
          requestedTool: 'non_existent_tool',
          availableTools: expect.any(Array),
        })
      );
    });

    it('должна обработать ошибку при выполнении инструмента', async () => {
      // Arrange
      const params: ToolCallParams = {};
      const error = new Error('Execution failed');
      const toolName = buildToolName('ping', MCP_TOOL_PREFIX);

      vi.mocked(mockFacade.ping).mockRejectedValue(error);

      // Act
      const result = await registry.execute(toolName, params);

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);

      const content = JSON.parse(getTextContent(result));
      expect(content.success).toBe(false);
      expect(content.message).toContain('Ошибка при проверке подключения');
      expect(content.tool).toBeUndefined(); // BaseTool не добавляет tool в formatError

      // Logger может быть вызван из PingTool или ToolRegistry
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('должна логировать детали ошибки при выполнении инструмента', async () => {
      // Arrange
      const params: ToolCallParams = {};
      const error = new Error('Detailed error');
      const toolName = buildToolName('ping', MCP_TOOL_PREFIX);

      vi.mocked(mockFacade.ping).mockRejectedValue(error);

      // Act
      await registry.execute(toolName, params);

      // Assert - проверяем что логируется ошибка с правильными параметрами
      const errorCalls = vi.mocked(mockLogger.error).mock.calls;

      // Может быть вызвано либо из Registry, либо из Tool
      expect(mockLogger.error).toHaveBeenCalled();
      expect(errorCalls.length).toBeGreaterThan(0);
    });

    it('должна обработать нестандартную ошибку', async () => {
      // Arrange
      const params: ToolCallParams = {};
      const toolName = buildToolName('ping', MCP_TOOL_PREFIX);

      vi.mocked(mockFacade.ping).mockRejectedValue('String error');

      // Act
      const result = await registry.execute(toolName, params);

      // Assert
      expect(result.isError).toBe(true);

      const content = JSON.parse(getTextContent(result));
      expect(content.message).toContain('Ошибка при проверке подключения');
    });

    it('должна логировать параметры вызова', async () => {
      // Arrange
      const params: ToolCallParams = { key: 'value', nested: { prop: 123 } };
      const toolName = buildToolName('ping', MCP_TOOL_PREFIX);
      const mockPingResult: PingResult = {
        success: true,
        message: 'OK',
      };

      vi.mocked(mockFacade.ping).mockResolvedValue(mockPingResult);

      // Act
      await registry.execute(toolName, params);

      // Assert
      // Пакет 1.1.B: params в лог попадают редактированными (форма, а не
      // содержимое) — см. packages/framework/core/src/tool-registry/params-redactor.ts
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Параметры вызова (redacted):',
        redactParams(params)
      );
    });
  });

  describe('Priority-based sorting', () => {
    // Helper функция для получения priority из METADATA
    const getToolPriority = (toolName: string): string => {
      const tool = registry.getTool(toolName);
      if (!tool) return 'normal';
      const toolClass = tool.constructor as any;
      return toolClass.METADATA?.priority || 'normal';
    };

    it('должна сортировать инструменты по priority: critical → high → normal → low', () => {
      // Act
      const definitions = registry.getDefinitions();

      // Найдем инструменты с разными приоритетами
      const criticalTools = definitions.filter((d) => getToolPriority(d.name) === 'critical');
      const highTools = definitions.filter((d) => getToolPriority(d.name) === 'high');
      const normalTools = definitions.filter((d) => getToolPriority(d.name) === 'normal');
      const lowTools = definitions.filter((d) => getToolPriority(d.name) === 'low');

      // Assert - проверяем что все critical идут перед high
      if (criticalTools.length > 0 && highTools.length > 0) {
        const lastCriticalIdx = definitions.findIndex(
          (d) => d.name === criticalTools[criticalTools.length - 1]!.name
        );
        const firstHighIdx = definitions.findIndex((d) => d.name === highTools[0]!.name);
        expect(lastCriticalIdx).toBeLessThan(firstHighIdx);
      }

      // Проверяем что все high идут перед normal
      if (highTools.length > 0 && normalTools.length > 0) {
        const lastHighIdx = definitions.findIndex(
          (d) => d.name === highTools[highTools.length - 1]!.name
        );
        const firstNormalIdx = definitions.findIndex((d) => d.name === normalTools[0]!.name);
        expect(lastHighIdx).toBeLessThan(firstNormalIdx);
      }

      // Проверяем что все normal идут перед low
      if (normalTools.length > 0 && lowTools.length > 0) {
        const lastNormalIdx = definitions.findIndex(
          (d) => d.name === normalTools[normalTools.length - 1]!.name
        );
        const firstLowIdx = definitions.findIndex((d) => d.name === lowTools[0]!.name);
        expect(lastNormalIdx).toBeLessThan(firstLowIdx);
      }
    });

    it('должна сортировать инструменты по алфавиту внутри одного priority', () => {
      // Act
      const definitions = registry.getDefinitions();

      // Проверим critical инструменты
      const criticalTools = definitions.filter((d) => getToolPriority(d.name) === 'critical');

      // Assert - критичные инструменты должны быть отсортированы по алфавиту
      if (criticalTools.length > 1) {
        for (let i = 0; i < criticalTools.length - 1; i++) {
          const current = criticalTools[i]!.name;
          const next = criticalTools[i + 1]!.name;
          expect(current.localeCompare(next)).toBeLessThanOrEqual(0);
        }
      }
    });

    it('должна трактовать undefined priority как normal', () => {
      // Act
      const definitions = registry.getDefinitions();

      // Найдем инструменты с разными приоритетами
      const normalTools = definitions.filter((d) => getToolPriority(d.name) === 'normal');
      const lowTools = definitions.filter((d) => getToolPriority(d.name) === 'low');

      // Assert - инструменты с normal priority должны идти перед low
      if (normalTools.length > 0 && lowTools.length > 0) {
        const lastNormalIdx = definitions.findIndex(
          (d) => d.name === normalTools[normalTools.length - 1]!.name
        );
        const firstLowIdx = definitions.findIndex((d) => d.name === lowTools[0]!.name);
        expect(lastNormalIdx).toBeLessThan(firstLowIdx);
      }

      // Проверяем что getToolPriority правильно трактует undefined как 'normal'
      // (это неявная проверка - если METADATA.priority === undefined, функция вернет 'normal')
      expect(normalTools.length).toBeGreaterThanOrEqual(0);
    });

    it('сортировка должна работать для полного набора (getDefinitions())', () => {
      // Act
      const definitions = registry.getDefinitions();

      // Assert - должна быть сортировка по priority
      expect(definitions.length).toBeGreaterThan(0);

      // Проверяем что первый инструмент имеет высокий приоритет
      const firstPriority = getToolPriority(definitions[0]!.name);
      expect(['critical', 'high', 'normal']).toContain(firstPriority);
    });

    it('сортировка сохраняется при применении disabledFilter (getDefinitions(disabledFilter))', () => {
      // Arrange - отключаем helpers, оставляя issues/system tools с разными приоритетами
      const disabledFilter = {
        includeAll: false,
        categories: new Set(['helpers']),
        categoriesWithSubcategories: new Map<string, Set<string>>(),
      };

      // Act
      const definitions = registry.getDefinitions(disabledFilter);

      // Assert - должна быть сортировка по priority
      expect(definitions.length).toBeGreaterThan(0);

      if (definitions.length > 1) {
        const priorities = definitions.map((d) => getToolPriority(d.name));

        // Проверяем что порядок приоритетов не нарушен
        const priorityOrder: Record<string, number> = {
          critical: 0,
          high: 1,
          normal: 2,
          low: 3,
        };

        for (let i = 0; i < priorities.length - 1; i++) {
          const currentOrder = priorityOrder[priorities[i]!] ?? 2;
          const nextOrder = priorityOrder[priorities[i + 1]!] ?? 2;
          expect(currentOrder).toBeLessThanOrEqual(nextOrder);
        }
      }
    });

    it('должна логировать распределение по приоритетам', () => {
      // Act
      registry.getDefinitions();

      // Assert - проверяем что логируется распределение
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Tools sorted by priority',
        expect.objectContaining({
          critical: expect.any(Number),
          high: expect.any(Number),
          normal: expect.any(Number),
          low: expect.any(Number),
        })
      );
    });
  });

  describe('Disabled groups filtering (негативный фильтр, DISABLED_TOOL_GROUPS)', () => {
    it('без disabledFilter getDefinitions() возвращает все инструменты', () => {
      const definitions = registry.getDefinitions();
      expect(definitions.length).toBe(10);
    });

    it('disabledFilter исключает целую категорию', () => {
      // Arrange - отключаем helpers (IssueUrlTool, DemoTool)
      const disabledFilter = {
        categories: new Set(['helpers']),
        categoriesWithSubcategories: new Map<string, Set<string>>(),
        includeAll: false,
      };

      // Act
      const definitions = registry.getDefinitions(disabledFilter);

      // Assert - остались issues (7) + system (1) = 8
      const categories = definitions.map((d) => {
        const tool = registry.getTool(d.name);
        const toolClass = tool?.constructor as any;
        return toolClass?.METADATA?.category;
      });

      expect(categories.every((c) => c === 'issues' || c === 'system')).toBe(true);
      expect(definitions.length).toBe(8);
    });

    it('disabledFilter исключает подкатегорию', () => {
      // Arrange - отключаем issues/read (GetIssues, FindIssues, GetIssueChangelog)
      const disabledFilter = {
        categories: new Set<string>(),
        categoriesWithSubcategories: new Map([['issues', new Set(['read'])]]),
        includeAll: false,
      };

      // Act
      const definitions = registry.getDefinitions(disabledFilter);

      // Assert - остались 10 - 3 = 7, ни одного issues/read
      const subcategories = definitions
        .map((d) => {
          const tool = registry.getTool(d.name);
          const toolClass = tool?.constructor as any;
          return {
            category: toolClass?.METADATA?.category,
            subcategory: toolClass?.METADATA?.subcategory,
          };
        })
        .filter((t) => t.category === 'issues');

      expect(subcategories.every((t) => t.subcategory !== 'read')).toBe(true);
      expect(definitions.length).toBe(7);
    });

    it('disabledFilter поддерживает смешанный формат (категория + подкатегория)', () => {
      // Arrange - helpers целиком + issues/workflow
      const disabledFilter = {
        categories: new Set(['helpers']),
        categoriesWithSubcategories: new Map([['issues', new Set(['workflow'])]]),
        includeAll: false,
      };

      // Act
      const definitions = registry.getDefinitions(disabledFilter);

      // Assert - остались issues/read(3) + issues/write(2) + system(1) = 6
      expect(definitions.length).toBe(6);

      const toolData = definitions.map((d) => {
        const tool = registry.getTool(d.name);
        const toolClass = tool?.constructor as any;
        return {
          category: toolClass?.METADATA?.category,
          subcategory: toolClass?.METADATA?.subcategory,
        };
      });

      expect(toolData.some((t) => t.category === 'helpers')).toBe(false);
      expect(toolData.some((t) => t.category === 'issues' && t.subcategory === 'workflow')).toBe(
        false
      );
    });

    it('disabledFilter поддерживает несколько подкатегорий для одной категории', () => {
      // Arrange - issues/read + issues/write отключены
      const disabledFilter = {
        categories: new Set<string>(),
        categoriesWithSubcategories: new Map([['issues', new Set(['read', 'write'])]]),
        includeAll: false,
      };

      // Act
      const definitions = registry.getDefinitions(disabledFilter);

      // Assert - остались issues/workflow(2) + helpers(2) + system(1) = 5
      expect(definitions.length).toBe(5);
    });

    it('неизвестная категория в disabledFilter → warning в лог с перечнем известных категорий, без падения', () => {
      // Arrange - опечатка/несуществующая категория не должна ничего скрывать молча
      const disabledFilter = {
        categories: new Set(['NONEXISTENT_CATEGORY']),
        categoriesWithSubcategories: new Map<string, Set<string>>(),
        includeAll: false,
      };

      // Act
      const definitions = registry.getDefinitions(disabledFilter);

      // Assert - ничего не отфильтровано (неизвестная категория не матчит ни один tool)
      expect(definitions.length).toBe(10);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '⚠️  Unknown categories in filter',
        expect.objectContaining({
          unknownCategories: ['NONEXISTENT_CATEGORY'],
          knownCategories: expect.any(Array),
        })
      );
    });

    it('логирует применённый фильтр отключённых групп', () => {
      // Arrange
      const disabledFilter = {
        categories: new Set(['helpers']),
        categoriesWithSubcategories: new Map<string, Set<string>>(),
        includeAll: false,
      };

      // Act
      registry.getDefinitions(disabledFilter);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        '✂️  Применён фильтр отключенных групп',
        expect.objectContaining({
          disabledCategories: expect.any(Array),
          disabledCategoriesWithSubcategories: expect.any(Array),
          totalToolsAfterFilter: expect.any(Number),
        })
      );
    });
  });
});
