import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PingTool } from '#tools/ping.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import type { ToolCallParams } from '@mcp-framework/infrastructure/types.js';
import type { PingResult } from '#tracker_api/api_operations/user/ping.operation.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

describe('PingTool', () => {
  let tool: PingTool;
  let mockFacade: YandexTrackerFacade;
  let mockLogger: Logger;

  beforeEach(() => {
    // Mock YandexTrackerFacade
    mockFacade = {
      ping: vi.fn(),
      getIssues: vi.fn(),
    } as unknown as YandexTrackerFacade;

    // Mock Logger
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      child: vi.fn(() => mockLogger),
    } as unknown as Logger;

    tool = new PingTool(mockFacade, mockLogger);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getDefinition', () => {
    it('должна вернуть корректное определение инструмента', () => {
      // Act
      const definition = tool.getDefinition();

      // Assert
      expect(definition.name).toBe(buildToolName('ping', MCP_TOOL_PREFIX));
      expect(definition.description).toContain('Проверка доступности API');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.properties).toEqual({});
      expect(definition.inputSchema.required).toEqual([]);
    });
  });

  describe('execute', () => {
    it('должна успешно выполнить проверку подключения', async () => {
      // Arrange
      const params: ToolCallParams = {};
      const mockPingResult: PingResult = {
        success: true,
        message: 'Подключение к API Яндекс.Трекера v3 успешно. Пользователь: Test User',
      };

      vi.mocked(mockFacade.ping).mockResolvedValue(mockPingResult);

      // Act
      const result = await tool.execute(params);

      // Assert
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0]!.type).toBe('text');

      const content = JSON.parse(result.content[0]!.text);
      expect(content.success).toBe(true);
      expect(content.data.message).toContain('Test User');
      expect(content.data.timestamp).toBeDefined();

      expect(mockLogger.info).toHaveBeenCalledWith('Проверка подключения к API Яндекс.Трекера...');
      expect(mockLogger.info).toHaveBeenCalledWith('Подключение успешно установлено');
      expect(mockFacade.ping).toHaveBeenCalled();
    });

    it('должна обработать ошибку подключения', async () => {
      // Arrange
      const params: ToolCallParams = {};
      const error = new Error('Connection failed');

      vi.mocked(mockFacade.ping).mockRejectedValue(error);

      // Act
      const result = await tool.execute(params);

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0]!.type).toBe('text');

      const content = JSON.parse(result.content[0]!.text);
      expect(content.success).toBe(false);
      expect(content.message).toContain('Ошибка при проверке подключения');
      expect(content.error).toContain('Connection failed');

      expect(mockLogger.info).toHaveBeenCalledWith('Проверка подключения к API Яндекс.Трекера...');
    });

    it('должна вернуть timestamp в ISO формате', async () => {
      // Arrange
      const params: ToolCallParams = {};
      const mockPingResult: PingResult = {
        success: true,
        message: 'Подключение успешно',
      };

      vi.mocked(mockFacade.ping).mockResolvedValue(mockPingResult);

      // Act
      const result = await tool.execute(params);

      // Assert
      const content = JSON.parse(result.content[0]!.text);
      expect(content.data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('должна игнорировать переданные параметры', async () => {
      // Arrange
      const params: ToolCallParams = { someParam: 'value' };
      const mockPingResult: PingResult = {
        success: true,
        message: 'Подключение успешно',
      };

      vi.mocked(mockFacade.ping).mockResolvedValue(mockPingResult);

      // Act
      const result = await tool.execute(params);

      // Assert
      expect(result.isError).toBeUndefined();
      expect(mockFacade.ping).toHaveBeenCalledWith(); // без параметров
    });
  });
});
