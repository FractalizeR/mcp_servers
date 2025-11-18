/**
 * Unit тесты для GetQueueFieldsTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetQueueFieldsTool } from '@tools/api/queues/get-queue-fields.tool.js';
import type { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '@constants';
import {
  createQueueFieldListFixture,
  createStandardSystemFields,
  createRequiredQueueFieldFixture,
} from '../../../helpers/queue-field.fixture.js';

describe('GetQueueFieldsTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetQueueFieldsTool;

  beforeEach(() => {
    mockTrackerFacade = {
      getQueueFields: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new GetQueueFieldsTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен вернуть корректное определение инструмента', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('get_queue_fields', MCP_TOOL_PREFIX));
      expect(definition.description).toContain('список обязательных полей очереди');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toContain('queueId');
      expect(definition.inputSchema.properties?.['queueId']).toBeDefined();
    });
  });

  describe('execute', () => {
    describe('валидация параметров (Zod)', () => {
      it('должен вернуть ошибку если queueId не указан', async () => {
        const result = await tool.execute({});

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку для пустого queueId', async () => {
        const result = await tool.execute({ queueId: '' });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен принимать корректный queueId', async () => {
        const mockFields = createQueueFieldListFixture(3);
        vi.mocked(mockTrackerFacade.getQueueFields).mockResolvedValue(mockFields);

        const result = await tool.execute({ queueId: 'TEST' });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.getQueueFields).toHaveBeenCalledWith({
          queueId: 'TEST',
        });
      });
    });

    describe('получение полей очереди', () => {
      it('должен получить список полей очереди', async () => {
        const mockFields = createQueueFieldListFixture(5);
        vi.mocked(mockTrackerFacade.getQueueFields).mockResolvedValue(mockFields);

        const result = await tool.execute({ queueId: 'TEST' });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.getQueueFields).toHaveBeenCalledWith({
          queueId: 'TEST',
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Получение полей очереди', {
          queueId: 'TEST',
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Поля очереди получены', {
          queueId: 'TEST',
          count: 5,
        });

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            fields: unknown[];
            count: number;
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.fields).toHaveLength(5);
        expect(parsed.data.count).toBe(5);
      });

      it('должен получить стандартные системные поля', async () => {
        const mockFields = createStandardSystemFields();
        vi.mocked(mockTrackerFacade.getQueueFields).mockResolvedValue(mockFields);

        const result = await tool.execute({ queueId: 'PROJ' });

        expect(result.isError).toBeUndefined();
        expect(mockLogger.info).toHaveBeenCalledWith('Поля очереди получены', {
          queueId: 'PROJ',
          count: 5,
        });

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            fields: Array<{
              key: string;
              name: string;
              required: boolean;
            }>;
          };
        };
        expect(parsed.data.fields).toHaveLength(5);
        expect(parsed.data.fields.some((f) => f.key === 'summary')).toBe(true);
        expect(parsed.data.fields.some((f) => f.key === 'status')).toBe(true);
        expect(parsed.data.fields.some((f) => f.key === 'priority')).toBe(true);
      });

      it('должен получить только обязательные поля', async () => {
        const mockFields = [
          createRequiredQueueFieldFixture({ key: 'summary', name: 'Summary' }),
          createRequiredQueueFieldFixture({ key: 'type', name: 'Type' }),
        ];
        vi.mocked(mockTrackerFacade.getQueueFields).mockResolvedValue(mockFields);

        const result = await tool.execute({ queueId: 'TEST' });

        expect(result.isError).toBeUndefined();

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            fields: Array<{
              key: string;
              required: boolean;
            }>;
            count: number;
          };
        };
        expect(parsed.data.count).toBe(2);
        expect(parsed.data.fields.every((f) => f.required === true)).toBe(true);
      });

      it('должен обработать пустой список полей', async () => {
        vi.mocked(mockTrackerFacade.getQueueFields).mockResolvedValue([]);

        const result = await tool.execute({ queueId: 'EMPTY' });

        expect(result.isError).toBeUndefined();
        expect(mockLogger.info).toHaveBeenCalledWith('Поля очереди получены', {
          queueId: 'EMPTY',
          count: 0,
        });

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            fields: unknown[];
            count: number;
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.fields).toHaveLength(0);
        expect(parsed.data.count).toBe(0);
      });

      it('должен получить поля для очереди по ID', async () => {
        const mockFields = createQueueFieldListFixture(3);
        vi.mocked(mockTrackerFacade.getQueueFields).mockResolvedValue(mockFields);

        const result = await tool.execute({ queueId: 'queue123' });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.getQueueFields).toHaveBeenCalledWith({
          queueId: 'queue123',
        });
      });

      it('должен получить поля с различными типами', async () => {
        const mockFields = [
          createRequiredQueueFieldFixture({
            key: 'summary',
            name: 'Summary',
            type: 'string',
          }),
          createRequiredQueueFieldFixture({
            key: 'assignee',
            name: 'Assignee',
            type: 'user',
          }),
          createRequiredQueueFieldFixture({
            key: 'priority',
            name: 'Priority',
            type: 'select',
          }),
        ];
        vi.mocked(mockTrackerFacade.getQueueFields).mockResolvedValue(mockFields);

        const result = await tool.execute({ queueId: 'TEST' });

        expect(result.isError).toBeUndefined();

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            fields: Array<{
              type: string;
            }>;
          };
        };
        expect(parsed.data.fields.some((f) => f.type === 'string')).toBe(true);
        expect(parsed.data.fields.some((f) => f.type === 'user')).toBe(true);
        expect(parsed.data.fields.some((f) => f.type === 'select')).toBe(true);
      });
    });

    describe('обработка ошибок', () => {
      it('должен обработать ошибку "очередь не найдена"', async () => {
        const error = new Error('Queue not found');
        vi.mocked(mockTrackerFacade.getQueueFields).mockRejectedValue(error);

        const result = await tool.execute({ queueId: 'NOTEXIST' });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('Ошибка при получении полей очереди NOTEXIST');
        expect(parsed.error).toBe('Queue not found');
      });

      it('должен обработать ошибку доступа', async () => {
        const error = new Error('Access denied');
        vi.mocked(mockTrackerFacade.getQueueFields).mockRejectedValue(error);

        const result = await tool.execute({ queueId: 'PRIVATE' });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.error).toBe('Access denied');
      });

      it('должен обработать сетевую ошибку', async () => {
        const error = new Error('Network timeout');
        vi.mocked(mockTrackerFacade.getQueueFields).mockRejectedValue(error);

        const result = await tool.execute({ queueId: 'TEST' });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.error).toBe('Network timeout');
      });

      it('должен обработать некорректный формат данных от API', async () => {
        const error = new Error('Invalid response format');
        vi.mocked(mockTrackerFacade.getQueueFields).mockRejectedValue(error);

        const result = await tool.execute({ queueId: 'TEST' });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.error).toBe('Invalid response format');
      });
    });
  });
});
