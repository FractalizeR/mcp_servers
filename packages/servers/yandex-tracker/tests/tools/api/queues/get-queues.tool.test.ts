/**
 * Unit тесты для GetQueuesTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetQueuesTool } from '#tools/api/queues/get-queues.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';
import { createQueueListFixture } from '#helpers/queue.fixture.js';

describe('GetQueuesTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetQueuesTool;

  beforeEach(() => {
    mockTrackerFacade = {
      getQueues: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new GetQueuesTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен вернуть корректное определение инструмента', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('get_queues', MCP_TOOL_PREFIX));
      expect(definition.description).toContain('список всех очередей');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['fields']);
      expect(definition.inputSchema.properties?.['perPage']).toBeDefined();
      expect(definition.inputSchema.properties?.['page']).toBeDefined();
      expect(definition.inputSchema.properties?.['expand']).toBeDefined();
      expect(definition.inputSchema.properties?.['fields']).toBeDefined();
    });
  });

  describe('execute', () => {
    describe('валидация параметров (Zod)', () => {
      it('должен использовать дефолтные значения если параметры не указаны', async () => {
        const mockQueues = createQueueListFixture(3);
        vi.mocked(mockTrackerFacade.getQueues).mockResolvedValue(mockQueues);

        const result = await tool.execute({ fields: ['id', 'key', 'name'] });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.getQueues).toHaveBeenCalledWith({
          perPage: 50,
          page: 1,
          expand: undefined,
        });
      });

      it('должен вернуть ошибку для некорректного perPage (отрицательное)', async () => {
        const result = await tool.execute({ perPage: -1, fields: ['id', 'key', 'name'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку для некорректного perPage (больше 100)', async () => {
        const result = await tool.execute({ perPage: 101, fields: ['id', 'key', 'name'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку для некорректного page (отрицательное)', async () => {
        const result = await tool.execute({ page: 0, fields: ['id', 'key', 'name'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен принимать корректные параметры пагинации', async () => {
        const mockQueues = createQueueListFixture(10);
        vi.mocked(mockTrackerFacade.getQueues).mockResolvedValue(mockQueues);

        const result = await tool.execute({ perPage: 10, page: 2, fields: ['id', 'key', 'name'] });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.getQueues).toHaveBeenCalledWith({
          perPage: 10,
          page: 2,
          expand: undefined,
        });
      });
    });

    describe('получение списка очередей', () => {
      it('должен получить список очередей без expand', async () => {
        const mockQueues = createQueueListFixture(3);
        vi.mocked(mockTrackerFacade.getQueues).mockResolvedValue(mockQueues);

        const result = await tool.execute({ fields: ['id', 'key', 'name'] });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.getQueues).toHaveBeenCalledWith({
          perPage: 50,
          page: 1,
          expand: undefined,
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Получение списка очередей', {
          perPage: 50,
          page: 1,
          expand: 'none',
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Список очередей получен', {
          count: 3,
          page: 1,
        });

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            queues: unknown[];
            count: number;
            page: number;
            perPage: number;
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.queues).toHaveLength(3);
        expect(parsed.data.count).toBe(3);
        expect(parsed.data.page).toBe(1);
        expect(parsed.data.perPage).toBe(50);
      });

      it('должен получить список очередей с expand параметром', async () => {
        const mockQueues = createQueueListFixture(2);
        vi.mocked(mockTrackerFacade.getQueues).mockResolvedValue(mockQueues);

        const result = await tool.execute({ expand: 'projects', fields: ['id', 'key', 'name'] });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.getQueues).toHaveBeenCalledWith({
          perPage: 50,
          page: 1,
          expand: 'projects',
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Получение списка очередей', {
          perPage: 50,
          page: 1,
          expand: 'projects',
        });
      });

      it('должен получить список с кастомными perPage и page', async () => {
        const mockQueues = createQueueListFixture(5);
        vi.mocked(mockTrackerFacade.getQueues).mockResolvedValue(mockQueues);

        const result = await tool.execute({ perPage: 5, page: 3, fields: ['id', 'key', 'name'] });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.getQueues).toHaveBeenCalledWith({
          perPage: 5,
          page: 3,
          expand: undefined,
        });

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            page: number;
            perPage: number;
          };
        };
        expect(parsed.data.page).toBe(3);
        expect(parsed.data.perPage).toBe(5);
      });

      it('должен обработать пустой результат', async () => {
        vi.mocked(mockTrackerFacade.getQueues).mockResolvedValue([]);

        const result = await tool.execute({ fields: ['id', 'key', 'name'] });

        expect(result.isError).toBeUndefined();
        expect(mockLogger.info).toHaveBeenCalledWith('Список очередей получен', {
          count: 0,
          page: 1,
        });

        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            queues: unknown[];
            count: number;
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.queues).toHaveLength(0);
        expect(parsed.data.count).toBe(0);
      });
    });

    describe('обработка ошибок', () => {
      it('должен обработать ошибку facade', async () => {
        const error = new Error('API Error');
        vi.mocked(mockTrackerFacade.getQueues).mockRejectedValue(error);

        const result = await tool.execute({ fields: ['id', 'key', 'name'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('Ошибка при получении списка очередей');
        expect(parsed.error).toBe('API Error');
      });

      it('должен обработать сетевую ошибку', async () => {
        const error = new Error('Network timeout');
        vi.mocked(mockTrackerFacade.getQueues).mockRejectedValue(error);

        const result = await tool.execute({ perPage: 10, page: 1, fields: ['id', 'key', 'name'] });

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
