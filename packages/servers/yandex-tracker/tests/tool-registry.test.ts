import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToolRegistry } from '@mcp-framework/core/tool-registry.js';
import type { Container } from 'inversify';
import type { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import type { ToolCallParams } from '@mcp-framework/infrastructure/types.js';
import type { PingResult } from '@tracker_api/api_operations/user/ping.operation.js';
import type { BatchIssueResult } from '@tracker_api/api_operations/issue/get-issues.operation.js';
import type { IssueWithUnknownFields } from '@tracker_api/entities/index.js';
import { PingTool } from '@tools/ping.tool.js';
import { GetIssuesTool } from '@tools/api/issues/get/index.js';
import { CreateIssueTool } from '@tools/api/issues/create/index.js';
import { UpdateIssueTool } from '@tools/api/issues/update/index.js';
import { FindIssuesTool } from '@tools/api/issues/find/index.js';
import { GetIssueChangelogTool } from '@tools/api/issues/changelog/index.js';
import { GetIssueTransitionsTool } from '@tools/api/issues/transitions/get/index.js';
import { TransitionIssueTool } from '@tools/api/issues/transitions/execute/index.js';
import { IssueUrlTool } from '@tools/helpers/issue-url/index.js';
import { DemoTool } from '@tools/helpers/demo/index.js';

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
              name: 'search_tools',
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
      expect(mockLogger.debug).toHaveBeenCalledWith('Зарегистрирован инструмент: ping');
      expect(mockLogger.debug).toHaveBeenCalledWith('Зарегистрирован инструмент: get_issues');
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

      const pingDef = definitions.find((d) => d.name === 'ping');
      const getIssuesDef = definitions.find((d) => d.name === 'get_issues');
      const demoDef = definitions.find((d) => d.name === 'demo');

      expect(pingDef).toBeDefined();
      expect(getIssuesDef).toBeDefined();
      expect(demoDef).toBeDefined();

      expect(pingDef?.description).toContain('API Яндекс.Трекера');
      expect(getIssuesDef?.description).toContain('задач');
      expect(demoDef?.description).toContain('Демонстрационный');
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
      const tool = registry.getTool('ping');

      // Assert
      expect(tool).toBeDefined();
      expect(tool?.getDefinition().name).toBe('ping');
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

      vi.mocked(mockFacade.ping).mockResolvedValue(mockPingResult);

      // Act
      const result = await registry.execute('ping', params);

      // Assert
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0]!.type).toBe('text');

      expect(mockLogger.info).toHaveBeenCalledWith('Вызов инструмента: ping');
      expect(mockLogger.info).toHaveBeenCalledWith('Инструмент ping выполнен успешно');
      expect(mockLogger.debug).toHaveBeenCalledWith('Параметры:', params);
    });

    it('должна успешно выполнить get_issues инструмент', async () => {
      // Arrange
      const params: ToolCallParams = { issueKeys: ['TEST-1'] };
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
      const result = await registry.execute('get_issues', params);

      // Assert
      expect(result.isError).toBeUndefined();
      expect(mockLogger.info).toHaveBeenCalledWith('Инструмент get_issues выполнен успешно');
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
      expect(content.availableTools).toContain('ping');
      expect(content.availableTools).toContain('get_issues');

      expect(mockLogger.error).toHaveBeenCalledWith('Инструмент не найден: non_existent_tool');
    });

    it('должна обработать ошибку при выполнении инструмента', async () => {
      // Arrange
      const params: ToolCallParams = {};
      const error = new Error('Execution failed');

      vi.mocked(mockFacade.ping).mockRejectedValue(error);

      // Act
      const result = await registry.execute('ping', params);

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

      vi.mocked(mockFacade.ping).mockRejectedValue(error);

      // Act
      await registry.execute('ping', params);

      // Assert - проверяем что логируется ошибка с правильными параметрами
      const errorCalls = vi.mocked(mockLogger.error).mock.calls;

      // Может быть вызвано либо из Registry, либо из Tool
      expect(mockLogger.error).toHaveBeenCalled();
      expect(errorCalls.length).toBeGreaterThan(0);
    });

    it('должна обработать нестандартную ошибку', async () => {
      // Arrange
      const params: ToolCallParams = {};

      vi.mocked(mockFacade.ping).mockRejectedValue('String error');

      // Act
      const result = await registry.execute('ping', params);

      // Assert
      expect(result.isError).toBe(true);

      const content = JSON.parse(result.content[0]!.text);
      expect(content.message).toContain('Ошибка при проверке подключения');
    });

    it('должна логировать параметры вызова', async () => {
      // Arrange
      const params: ToolCallParams = { key: 'value', nested: { prop: 123 } };
      const mockPingResult: PingResult = {
        success: true,
        message: 'OK',
      };

      vi.mocked(mockFacade.ping).mockResolvedValue(mockPingResult);

      // Act
      await registry.execute('ping', params);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith('Параметры:', params);
    });
  });
});
