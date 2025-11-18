/**
 * Unit тесты для DeleteComponentTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeleteComponentTool } from '@tools/api/components/delete-component.tool.js';
import type { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '@constants';

describe('DeleteComponentTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: DeleteComponentTool;

  beforeEach(() => {
    mockTrackerFacade = {
      deleteComponent: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new DeleteComponentTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен вернуть корректное определение инструмента', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('delete_component', MCP_TOOL_PREFIX));
      expect(definition.description).toContain('компонент');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toContain('componentId');
      expect(definition.inputSchema.properties?.['componentId']).toBeDefined();
    });
  });

  describe('execute', () => {
    describe('валидация параметров (Zod)', () => {
      it('должен вернуть ошибку если componentId не указан', async () => {
        const result = await tool.execute({});

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку для пустого componentId', async () => {
        const result = await tool.execute({ componentId: '' });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен принимать корректный componentId', async () => {
        vi.mocked(mockTrackerFacade.deleteComponent).mockResolvedValue(undefined);

        const result = await tool.execute({ componentId: '123' });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.deleteComponent).toHaveBeenCalledWith({
          componentId: '123',
        });
      });
    });

    describe('удаление компонента', () => {
      it('должен удалить компонент по ID', async () => {
        vi.mocked(mockTrackerFacade.deleteComponent).mockResolvedValue(undefined);

        const result = await tool.execute({ componentId: '123' });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.deleteComponent).toHaveBeenCalledWith({
          componentId: '123',
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Удаление компонента', {
          componentId: '123',
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Компонент удален', {
          componentId: '123',
        });

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            componentId: string;
            message: string;
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.componentId).toBe('123');
        expect(parsed.data.message).toContain('успешно удален');
      });

      it('должен удалить компонент с числовым ID', async () => {
        vi.mocked(mockTrackerFacade.deleteComponent).mockResolvedValue(undefined);

        const result = await tool.execute({ componentId: '456' });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.deleteComponent).toHaveBeenCalledWith({
          componentId: '456',
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Компонент удален', {
          componentId: '456',
        });
      });

      it('должен удалить компонент с UUID-подобным ID', async () => {
        vi.mocked(mockTrackerFacade.deleteComponent).mockResolvedValue(undefined);

        const result = await tool.execute({ componentId: 'abc-123-def-456' });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.deleteComponent).toHaveBeenCalledWith({
          componentId: 'abc-123-def-456',
        });
      });

      it('должен вызвать facade.deleteComponent ровно один раз', async () => {
        vi.mocked(mockTrackerFacade.deleteComponent).mockResolvedValue(undefined);

        await tool.execute({ componentId: '123' });

        expect(mockTrackerFacade.deleteComponent).toHaveBeenCalledTimes(1);
      });

      it('должен логировать оба события (начало и завершение)', async () => {
        vi.mocked(mockTrackerFacade.deleteComponent).mockResolvedValue(undefined);

        await tool.execute({ componentId: '789' });

        expect(mockLogger.info).toHaveBeenCalledTimes(2);
        expect(mockLogger.info).toHaveBeenNthCalledWith(1, 'Удаление компонента', {
          componentId: '789',
        });
        expect(mockLogger.info).toHaveBeenNthCalledWith(2, 'Компонент удален', {
          componentId: '789',
        });
      });
    });

    describe('обработка ошибок', () => {
      it('должен обработать ошибку "компонент не найден"', async () => {
        const error = new Error('Component not found');
        vi.mocked(mockTrackerFacade.deleteComponent).mockRejectedValue(error);

        const result = await tool.execute({ componentId: 'NOTEXIST' });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('Ошибка при удалении компонента');
        expect(parsed.error).toBe('Component not found');
      });

      it('должен обработать ошибку "недостаточно прав"', async () => {
        const error = new Error('Permission denied');
        vi.mocked(mockTrackerFacade.deleteComponent).mockRejectedValue(error);

        const result = await tool.execute({ componentId: '123' });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.error).toBe('Permission denied');
      });

      it('должен обработать ошибку "компонент используется"', async () => {
        const error = new Error('Component is in use');
        vi.mocked(mockTrackerFacade.deleteComponent).mockRejectedValue(error);

        const result = await tool.execute({ componentId: '123' });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.error).toBe('Component is in use');
      });

      it('должен обработать сетевую ошибку', async () => {
        const error = new Error('Network timeout');
        vi.mocked(mockTrackerFacade.deleteComponent).mockRejectedValue(error);

        const result = await tool.execute({ componentId: '123' });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.error).toBe('Network timeout');
      });

      it('должен обработать ошибку API', async () => {
        const error = new Error('API Error: 500 Internal Server Error');
        vi.mocked(mockTrackerFacade.deleteComponent).mockRejectedValue(error);

        const result = await tool.execute({ componentId: '123' });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.error).toContain('API Error');
      });

      it('должен обработать неожиданную ошибку', async () => {
        const error = new Error('Unexpected error');
        vi.mocked(mockTrackerFacade.deleteComponent).mockRejectedValue(error);

        const result = await tool.execute({ componentId: '123' });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('Ошибка при удалении компонента');
        expect(parsed.error).toBe('Unexpected error');
      });

      it('должен не вызывать второй лог при ошибке', async () => {
        const error = new Error('Test error');
        vi.mocked(mockTrackerFacade.deleteComponent).mockRejectedValue(error);

        await tool.execute({ componentId: '123' });

        // Должен быть вызван только первый лог (начало операции)
        expect(mockLogger.info).toHaveBeenCalledTimes(1);
        expect(mockLogger.info).toHaveBeenCalledWith('Удаление компонента', {
          componentId: '123',
        });
      });
    });
  });
});
