/**
 * Unit тесты для GetQueueTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetQueueTool } from '@tools/api/queues/get-queue.tool.js';
import type { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '@constants';
import { createQueueFixture } from '../../../helpers/queue.fixture.js';

describe('GetQueueTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetQueueTool;

  beforeEach(() => {
    mockTrackerFacade = {
      getQueue: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new GetQueueTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен вернуть корректное определение инструмента', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('get_queue', MCP_TOOL_PREFIX));
      expect(definition.description).toContain('детальную информацию об одной очереди');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toContain('queueId');
      expect(definition.inputSchema.properties?.['queueId']).toBeDefined();
      expect(definition.inputSchema.properties?.['expand']).toBeDefined();
    });
  });

  describe('execute', () => {
    describe('валидация параметров (Zod)', () => {
      it('должен вернуть ошибку если queueId не указан', async () => {
        const result = await tool.execute({ fields: ['id', 'key', 'name'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку для пустого queueId', async () => {
        const result = await tool.execute({ queueId: '', fields: ['id', 'key', 'name'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен принимать корректный queueId', async () => {
        const mockQueue = createQueueFixture({ key: 'TEST' });
        vi.mocked(mockTrackerFacade.getQueue).mockResolvedValue(mockQueue);

        const result = await tool.execute({ queueId: 'TEST', fields: ['id', 'key', 'name'] });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.getQueue).toHaveBeenCalledWith({
          queueId: 'TEST',
          expand: undefined,
        });
      });
    });

    describe('получение очереди', () => {
      it('должен получить очередь по ключу без expand', async () => {
        const mockQueue = createQueueFixture({ key: 'TEST', name: 'Test Queue' });
        vi.mocked(mockTrackerFacade.getQueue).mockResolvedValue(mockQueue);

        const result = await tool.execute({ queueId: 'TEST', fields: ['id', 'key', 'name'] });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.getQueue).toHaveBeenCalledWith({
          queueId: 'TEST',
          expand: undefined,
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Получение очереди', {
          queueId: 'TEST',
          expand: 'none',
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Очередь получена', {
          queueKey: 'TEST',
          queueName: 'Test Queue',
        });

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            queue: {
              key: string;
              name: string;
            };
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.queue.key).toBe('TEST');
        expect(parsed.data.queue.name).toBe('Test Queue');
      });

      it('должен получить очередь по ID без expand', async () => {
        const mockQueue = createQueueFixture({ id: 'queue123', key: 'PROJ' });
        vi.mocked(mockTrackerFacade.getQueue).mockResolvedValue(mockQueue);

        const result = await tool.execute({ queueId: 'queue123', fields: ['id', 'key', 'name'] });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.getQueue).toHaveBeenCalledWith({
          queueId: 'queue123',
          expand: undefined,
        });

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            queue: {
              id: string;
              key: string;
            };
          };
        };
        expect(parsed.data.queue.id).toBe('queue123');
        expect(parsed.data.queue.key).toBe('PROJ');
      });

      it('должен получить очередь с expand параметром', async () => {
        const mockQueue = createQueueFixture({ key: 'TEST' });
        vi.mocked(mockTrackerFacade.getQueue).mockResolvedValue(mockQueue);

        const result = await tool.execute({
          queueId: 'TEST',
          expand: 'projects',
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.getQueue).toHaveBeenCalledWith({
          queueId: 'TEST',
          expand: 'projects',
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Получение очереди', {
          queueId: 'TEST',
          expand: 'projects',
        });
      });

      it('должен получить очередь со всеми полями', async () => {
        const mockQueue = createQueueFixture({
          key: 'PROJ',
          name: 'Project Queue',
          description: 'Test Description',
        });
        vi.mocked(mockTrackerFacade.getQueue).mockResolvedValue(mockQueue);

        const result = await tool.execute({
          queueId: 'PROJ',
          fields: ['id', 'key', 'name', 'description'],
        });

        expect(result.isError).toBeUndefined();

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            queue: {
              key: string;
              name: string;
              description?: string;
            };
          };
        };
        expect(parsed.data.queue.key).toBe('PROJ');
        expect(parsed.data.queue.name).toBe('Project Queue');
        expect(parsed.data.queue.description).toBe('Test Description');
      });
    });

    describe('обработка ошибок', () => {
      it('должен обработать ошибку "очередь не найдена"', async () => {
        const error = new Error('Queue not found');
        vi.mocked(mockTrackerFacade.getQueue).mockRejectedValue(error);

        const result = await tool.execute({ queueId: 'NOTEXIST', fields: ['id', 'key', 'name'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('Ошибка при получении очереди NOTEXIST');
        expect(parsed.error).toBe('Queue not found');
      });

      it('должен обработать ошибку доступа', async () => {
        const error = new Error('Access denied');
        vi.mocked(mockTrackerFacade.getQueue).mockRejectedValue(error);

        const result = await tool.execute({ queueId: 'PRIVATE', fields: ['id', 'key', 'name'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('Ошибка при получении очереди PRIVATE');
        expect(parsed.error).toBe('Access denied');
      });

      it('должен обработать сетевую ошибку', async () => {
        const error = new Error('Network timeout');
        vi.mocked(mockTrackerFacade.getQueue).mockRejectedValue(error);

        const result = await tool.execute({ queueId: 'TEST', fields: ['id', 'key', 'name'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.error).toBe('Network timeout');
      });
    });
  });
});
