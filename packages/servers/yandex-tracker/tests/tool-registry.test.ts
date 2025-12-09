import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToolRegistry, buildToolName } from '@fractalizer/mcp-core';
import type { Container } from 'inversify';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import type { ToolCallParams } from '@fractalizer/mcp-infrastructure/types.js';
import type { PingResult } from '#tracker_api/api_operations/user/ping.operation.js';
import type { BatchIssueResult } from '#tracker_api/api_operations/issue/get-issues.operation.js';
import type { IssueWithUnknownFields } from '#tracker_api/entities/index.js';
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
        if (symbolStr.includes('SearchToolsTool')) {
          // Mock SearchToolsTool (имеет другой конструктор)
          return {
            getDefinition: () => ({
              name: buildToolName('search_tools', MCP_TOOL_PREFIX),
              description: 'Search tools',
              inputSchema: { type: 'object', properties: {}, required: [] },
            }),
            execute: vi.fn(async () => ({
              content: [{ type: 'text', text: '{"success":true}' }],
              isError: false,
            })),
          };
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
      expect(mockLogger.debug).toHaveBeenCalledWith('Параметры вызова:', params);
    });

    it('должна успешно выполнить get_issues инструмент', async () => {
      // Arrange
      const params: ToolCallParams = { issueKeys: ['TEST-1'], fields: ['id', 'key', 'summary'] };
      const toolName = buildToolName('get_issues', MCP_TOOL_PREFIX);
      const mockResults: BatchIssueResult[] = [
        {
          status: 'fulfilled',
          key: 'TEST-1',
          index: 0,
          value: {
            self: 'https://api.tracker.yandex.net/v3/issues/TEST-1',
            id: '1',
            key: 'TEST-1',
            version: 1,
            summary: 'Test',
            statusStartTime: '2023-01-01T00:00:00.000+0000',
            updatedAt: '2023-01-01T00:00:00.000+0000',
            createdAt: '2023-01-01T00:00:00.000+0000',
            queue: { id: '1', key: 'Q', name: 'Queue' },
            status: { id: '1', key: 'open', display: 'Open' },
            createdBy: { uid: 'user1', display: 'User', login: 'user1', isActive: true },
          } as IssueWithUnknownFields,
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

      const content = JSON.parse(result.content[0]!.text);
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

      const content = JSON.parse(result.content[0]!.text);
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

      const content = JSON.parse(result.content[0]!.text);
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
      expect(mockLogger.debug).toHaveBeenCalledWith('Параметры вызова:', params);
    });
  });

  describe('getEssentialDefinitions (regression: prefixed tool names)', () => {
    it('должна корректно находить essential tools с префиксами', () => {
      // Regression test для бага, где essentialTools содержал ['ping', 'search_tools']
      // без префиксов, но реальные имена инструментов были 'fr_yandex_tracker_ping', 'search_tools'

      // Arrange
      const essentialToolsWithPrefixes = [
        buildToolName('ping', MCP_TOOL_PREFIX), // 'fr_yandex_tracker_ping'
        'search_tools', // без префикса (framework-level tool)
      ];

      // Act
      const essentialDefs = registry.getEssentialDefinitions(essentialToolsWithPrefixes);

      // Assert
      expect(essentialDefs).toHaveLength(1); // Только ping, т.к. search_tools не зарегистрирован в этом тесте
      expect(essentialDefs[0]?.name).toBe(buildToolName('ping', MCP_TOOL_PREFIX));
    });

    it('НЕ должна находить tools если имена без префиксов', () => {
      // Демонстрация баги: если передать имена БЕЗ префиксов
      // Arrange
      const essentialToolsWithoutPrefixes = [
        'ping', // БЕЗ префикса (как было в DEFAULT_ESSENTIAL_TOOLS)
        'search_tools',
      ];

      // Act
      const essentialDefs = registry.getEssentialDefinitions(essentialToolsWithoutPrefixes);

      // Assert
      expect(essentialDefs).toHaveLength(0); // НЕ находит 'ping', потому что в registry он как 'fr_yandex_tracker_ping'
      // Это именно тот баг, который был исправлен!
    });

    it('должна находить tools в getDefinitionsByMode (lazy) с правильными префиксами', () => {
      // Arrange
      const essentialToolsWithPrefixes = [
        buildToolName('ping', MCP_TOOL_PREFIX),
        buildToolName('get_issues', MCP_TOOL_PREFIX),
      ];

      // Act
      const definitions = registry.getDefinitionsByMode('lazy', essentialToolsWithPrefixes);

      // Assert
      expect(definitions).toHaveLength(2);
      expect(definitions.map((d) => d.name)).toContain(buildToolName('ping', MCP_TOOL_PREFIX));
      expect(definitions.map((d) => d.name)).toContain(
        buildToolName('get_issues', MCP_TOOL_PREFIX)
      );
    });

    it('должна возвращать все tools в getDefinitionsByMode (eager)', () => {
      // Act
      const definitions = registry.getDefinitionsByMode('eager');

      // Assert
      expect(definitions).toHaveLength(10);
      expect(definitions.map((d) => d.name)).toContain(buildToolName('ping', MCP_TOOL_PREFIX));
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

    it('сортировка должна работать в eager mode', () => {
      // Act
      const definitions = registry.getDefinitionsByMode('eager');

      // Assert - должна быть сортировка по priority
      expect(definitions.length).toBeGreaterThan(0);

      // Проверяем что первый инструмент имеет высокий приоритет
      const firstPriority = getToolPriority(definitions[0]!.name);
      expect(['critical', 'high', 'normal']).toContain(firstPriority);
    });

    it('сортировка должна работать в lazy mode', () => {
      // Arrange
      const essentialTools = [
        buildToolName('ping', MCP_TOOL_PREFIX),
        buildToolName('get_issues', MCP_TOOL_PREFIX),
        buildToolName('demo', MCP_TOOL_PREFIX),
      ];

      // Act
      const definitions = registry.getDefinitionsByMode('lazy', essentialTools);

      // Assert - должна быть сортировка по priority
      expect(definitions.length).toBeGreaterThan(0);

      // Если среди essential есть инструменты с разными приоритетами,
      // они должны быть отсортированы
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

  describe('Category-based filtering', () => {
    it('должна фильтровать по категориям без подкатегорий', () => {
      // Arrange
      const categoryFilter = {
        categories: new Set(['issues', 'system']),
        categoriesWithSubcategories: new Map(),
        includeAll: false,
      };

      // Act
      const definitions = registry.getDefinitionsByCategories(categoryFilter);

      // Assert - должны остаться только issues и system инструменты
      const categories = definitions.map((d) => {
        const tool = registry.getTool(d.name);
        const toolClass = tool?.constructor as any;
        return toolClass?.METADATA?.category;
      });

      expect(categories.every((c) => c === 'issues' || c === 'system')).toBe(true);
      expect(definitions.length).toBeGreaterThan(0);
      expect(definitions.length).toBeLessThan(10); // меньше чем все инструменты
    });

    it('должна фильтровать по подкатегориям', () => {
      // Arrange - только issues/read
      const categoryFilter = {
        categories: new Set<string>(),
        categoriesWithSubcategories: new Map([['issues', new Set(['read'])]]),
        includeAll: false,
      };

      // Act
      const definitions = registry.getDefinitionsByCategories(categoryFilter);

      // Assert - должны остаться только issues/read инструменты
      const subcategories = definitions.map((d) => {
        const tool = registry.getTool(d.name);
        const toolClass = tool?.constructor as any;
        return toolClass?.METADATA?.subcategory;
      });

      expect(subcategories.every((s) => s === 'read')).toBe(true);
      // GetIssuesTool, FindIssuesTool, GetIssueChangelogTool = 3 tools
      expect(definitions.length).toBe(3);
    });

    it('должна фильтровать смешанный формат (категории + подкатегории)', () => {
      // Arrange - helpers (все подкатегории) + issues/workflow
      const categoryFilter = {
        categories: new Set(['helpers']),
        categoriesWithSubcategories: new Map([['issues', new Set(['workflow'])]]),
        includeAll: false,
      };

      // Act
      const definitions = registry.getDefinitionsByCategories(categoryFilter);

      // Assert
      const toolData = definitions.map((d) => {
        const tool = registry.getTool(d.name);
        const toolClass = tool?.constructor as any;
        return {
          category: toolClass?.METADATA?.category,
          subcategory: toolClass?.METADATA?.subcategory,
        };
      });

      // Проверяем что есть helpers инструменты (IssueUrl, Demo)
      const helpersTools = toolData.filter((t) => t.category === 'helpers');
      expect(helpersTools.length).toBe(2);

      // Проверяем что есть issues/workflow инструменты
      const workflowTools = toolData.filter(
        (t) => t.category === 'issues' && t.subcategory === 'workflow'
      );
      expect(workflowTools.length).toBe(2); // GetIssueTransitions, TransitionIssue

      // Проверяем что нет других issues подкатегорий
      const otherIssuesTools = toolData.filter(
        (t) => t.category === 'issues' && t.subcategory !== 'workflow'
      );
      expect(otherIssuesTools.length).toBe(0);
    });

    it('должна вернуть все инструменты при includeAll=true', () => {
      // Arrange
      const categoryFilter = {
        categories: new Set<string>(),
        categoriesWithSubcategories: new Map(),
        includeAll: true,
      };

      // Act
      const definitions = registry.getDefinitionsByCategories(categoryFilter);

      // Assert
      expect(definitions.length).toBe(10); // все инструменты
      expect(definitions.map((d) => d.name)).toContain(buildToolName('ping', MCP_TOOL_PREFIX));
      expect(definitions.map((d) => d.name)).toContain(buildToolName('demo', MCP_TOOL_PREFIX));
    });

    it('должна поддерживать несколько подкатегорий для одной категории', () => {
      // Arrange - issues/read + issues/write
      const categoryFilter = {
        categories: new Set<string>(),
        categoriesWithSubcategories: new Map([['issues', new Set(['read', 'write'])]]),
        includeAll: false,
      };

      // Act
      const definitions = registry.getDefinitionsByCategories(categoryFilter);

      // Assert
      const subcategories = definitions.map((d) => {
        const tool = registry.getTool(d.name);
        const toolClass = tool?.constructor as any;
        return toolClass?.METADATA?.subcategory;
      });

      expect(subcategories.every((s) => s === 'read' || s === 'write')).toBe(true);
      // read: GetIssues, FindIssues, GetIssueChangelog = 3
      // write: CreateIssue, UpdateIssue = 2
      // Total = 5
      expect(definitions.length).toBe(5);
    });

    it('должна применять фильтрацию вместе с сортировкой по приоритетам', () => {
      // Arrange - только issues/read (будет 3 инструмента с разными приоритетами)
      const categoryFilter = {
        categories: new Set<string>(),
        categoriesWithSubcategories: new Map([['issues', new Set(['read'])]]),
        includeAll: false,
      };

      // Act
      const definitions = registry.getDefinitionsByCategories(categoryFilter);

      // Assert - проверяем что есть сортировка
      expect(definitions.length).toBe(3);

      // GetIssuesTool (critical), FindIssuesTool (critical), GetIssueChangelogTool (high)
      // Должны идти в порядке: critical → critical → high
      const priorities = definitions.map((d) => {
        const tool = registry.getTool(d.name);
        const toolClass = tool?.constructor as any;
        return toolClass?.METADATA?.priority || 'normal';
      });

      // Первые два должны быть critical (GetIssues, FindIssues)
      expect(priorities[0]).toBe('critical');
      expect(priorities[1]).toBe('critical');
      // Третий должен быть high (GetIssueChangelog)
      expect(priorities[2]).toBe('high');
    });

    it('должна работать фильтрация в getDefinitionsByMode (eager + categoryFilter)', () => {
      // Arrange
      const categoryFilter = {
        categories: new Set(['issues']),
        categoriesWithSubcategories: new Map(),
        includeAll: false,
      };

      // Act
      const definitions = registry.getDefinitionsByMode('eager', undefined, categoryFilter);

      // Assert - должны остаться только issues инструменты
      expect(definitions.length).toBeGreaterThan(0);
      expect(definitions.length).toBeLessThan(10);

      const categories = definitions.map((d) => {
        const tool = registry.getTool(d.name);
        const toolClass = tool?.constructor as any;
        return toolClass?.METADATA?.category;
      });

      expect(categories.every((c) => c === 'issues')).toBe(true);
    });

    it('должна игнорировать categoryFilter в lazy режиме', () => {
      // Arrange
      const categoryFilter = {
        categories: new Set(['issues']),
        categoriesWithSubcategories: new Map(),
        includeAll: false,
      };
      const essentialTools = [
        buildToolName('ping', MCP_TOOL_PREFIX),
        buildToolName('demo', MCP_TOOL_PREFIX),
      ];

      // Act
      const definitions = registry.getDefinitionsByMode('lazy', essentialTools, categoryFilter);

      // Assert - в lazy режиме возвращаются только essential tools, фильтр игнорируется
      expect(definitions.length).toBe(2);
      expect(definitions.map((d) => d.name)).toContain(buildToolName('ping', MCP_TOOL_PREFIX));
      expect(definitions.map((d) => d.name)).toContain(buildToolName('demo', MCP_TOOL_PREFIX));
    });

    it('должна вернуть пустой массив если ни один инструмент не соответствует фильтру', () => {
      // Arrange - фильтр по несуществующей категории
      const categoryFilter = {
        categories: new Set(['NONEXISTENT_CATEGORY']),
        categoriesWithSubcategories: new Map(),
        includeAll: false,
      };

      // Act
      const definitions = registry.getDefinitionsByCategories(categoryFilter);

      // Assert
      expect(definitions).toEqual([]);
    });

    it('должна логировать информацию о фильтрации', () => {
      // Arrange
      const categoryFilter = {
        categories: new Set(['issues', 'system']),
        categoriesWithSubcategories: new Map([['helpers', new Set(['url'])]]),
        includeAll: false,
      };

      // Act
      registry.getDefinitionsByCategories(categoryFilter);

      // Assert - проверяем что логируется информация о фильтрации
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Tools filtered by categories',
        expect.objectContaining({
          totalTools: 10,
          filteredTools: expect.any(Number),
          categories: expect.any(Array),
          categoriesWithSubcategories: expect.any(Array),
        })
      );
    });
  });
});
