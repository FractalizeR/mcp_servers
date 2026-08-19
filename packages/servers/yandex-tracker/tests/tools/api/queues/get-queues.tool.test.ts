/**
 * Unit тесты для GetQueuesTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetQueuesTool } from '#tools/api/queues/get-queues.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import { buildToolName } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { createQueueListFixture } from '#helpers/queue.fixture.js';
import type { PaginatedResult, QueueWithUnknownFields } from '#tracker_api/entities/index.js';
import { getTextContent } from '#helpers/tool-result.helper.js';

/** Обернуть массив очередей в PaginatedResult (single-page по умолчанию). */
function paginated(
  items: QueueWithUnknownFields[],
  overrides: Partial<PaginatedResult<QueueWithUnknownFields>['pagination']> = {}
): PaginatedResult<QueueWithUnknownFields> {
  return {
    items,
    pagination: {
      perPage: 50,
      hasNextPage: false,
      fetchedAll: true,
      truncated: false,
      hasError: false,
      pagesFetched: 1,
      ...overrides,
    },
  };
}

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
      expect(definition.description).toContain('Получить список очередей');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['fields']);
      expect(definition.inputSchema.properties?.['perPage']).toBeDefined();
      expect(definition.inputSchema.properties?.['cursor']).toBeDefined();
      expect(definition.inputSchema.properties?.['page']).toBeUndefined();
      expect(definition.inputSchema.properties?.['expand']).toBeDefined();
      expect(definition.inputSchema.properties?.['fields']).toBeDefined();
    });
  });

  describe('execute', () => {
    describe('валидация параметров (Zod)', () => {
      it('передаёт параметры в фасад без page (cursor-режим)', async () => {
        const mockQueues = createQueueListFixture(3);
        vi.mocked(mockTrackerFacade.getQueues).mockResolvedValue(paginated(mockQueues));

        const result = await tool.execute({ fields: ['id', 'key', 'name'] });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.getQueues).toHaveBeenCalledWith({
          perPage: undefined,
          cursor: undefined,
          expand: undefined,
          fetchAll: undefined,
          maxItems: undefined,
        });
      });

      it('должен вернуть ошибку для некорректного perPage (отрицательное)', async () => {
        const result = await tool.execute({ perPage: -1, fields: ['id', 'key', 'name'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(getTextContent(result)) as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку для некорректного perPage (больше 100)', async () => {
        const result = await tool.execute({ perPage: 101, fields: ['id', 'key', 'name'] });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(getTextContent(result)) as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен принимать корректный perPage', async () => {
        const mockQueues = createQueueListFixture(10);
        vi.mocked(mockTrackerFacade.getQueues).mockResolvedValue(paginated(mockQueues));

        const result = await tool.execute({ perPage: 10, fields: ['id', 'key', 'name'] });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.getQueues).toHaveBeenCalledWith(
          expect.objectContaining({ perPage: 10 })
        );
      });
    });

    describe('получение списка очередей', () => {
      it('должен получить список очередей без expand (без top-level page/perPage)', async () => {
        const mockQueues = createQueueListFixture(3);
        vi.mocked(mockTrackerFacade.getQueues).mockResolvedValue(paginated(mockQueues));

        const result = await tool.execute({ fields: ['id', 'key', 'name'] });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.getQueues).toHaveBeenCalledWith(
          expect.objectContaining({ expand: undefined, cursor: undefined })
        );
        expect(mockLogger.info).toHaveBeenCalledWith('Получение списка очередей', {
          expand: 'none',
        });
        expect(mockLogger.info).toHaveBeenCalledWith('Список очередей получен', {
          count: 3,
        });

        const parsed = JSON.parse(getTextContent(result)) as {
          success: boolean;
          data: {
            queues: unknown[];
            count: number;
            page?: number;
            perPage?: number;
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.queues).toHaveLength(3);
        expect(parsed.data.count).toBe(3);
        // R14: top-level эхо page/perPage убрано.
        expect('page' in parsed.data).toBe(false);
        expect('perPage' in parsed.data).toBe(false);
      });

      it('должен получить список очередей с expand параметром', async () => {
        const mockQueues = createQueueListFixture(2);
        vi.mocked(mockTrackerFacade.getQueues).mockResolvedValue(paginated(mockQueues));

        const result = await tool.execute({ expand: 'projects', fields: ['id', 'key', 'name'] });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.getQueues).toHaveBeenCalledWith(
          expect.objectContaining({ expand: 'projects' })
        );
        expect(mockLogger.info).toHaveBeenCalledWith('Получение списка очередей', {
          expand: 'projects',
        });
      });

      it('прокидывает cursor в фасад', async () => {
        const mockQueues = createQueueListFixture(5);
        vi.mocked(mockTrackerFacade.getQueues).mockResolvedValue(paginated(mockQueues));

        const result = await tool.execute({ cursor: 'c1:abc', fields: ['id', 'key', 'name'] });

        expect(result.isError).toBeUndefined();
        expect(mockTrackerFacade.getQueues).toHaveBeenCalledWith(
          expect.objectContaining({ cursor: 'c1:abc' })
        );
      });

      it('должен обработать пустой результат', async () => {
        vi.mocked(mockTrackerFacade.getQueues).mockResolvedValue(paginated([]));

        const result = await tool.execute({ fields: ['id', 'key', 'name'] });

        expect(result.isError).toBeUndefined();
        expect(mockLogger.info).toHaveBeenCalledWith('Список очередей получен', {
          count: 0,
        });

        const parsed = JSON.parse(getTextContent(result)) as {
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
        const parsed = JSON.parse(getTextContent(result)) as {
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
        const parsed = JSON.parse(getTextContent(result)) as {
          success: boolean;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.error).toBe('Network timeout');
      });
    });

    describe('пагинация', () => {
      it('pagination доходит до выдачи; top-level page/perPage отсутствуют (R14)', async () => {
        const mockQueues = createQueueListFixture(2);
        vi.mocked(mockTrackerFacade.getQueues).mockResolvedValue(
          paginated(mockQueues, {
            hasNextPage: true,
            fetchedAll: false,
            total: 9,
            totalPages: 5,
            nextCursor: 'c1:next',
          })
        );

        const result = await tool.execute({ fields: ['id', 'key', 'name'] });

        const parsed = JSON.parse(getTextContent(result)) as {
          data: {
            queues: unknown[];
            count: number;
            page?: number;
            perPage?: number;
            pagination: { hasNextPage: boolean; total?: number; nextCursor?: string };
          };
        };
        expect(parsed.data.queues).toHaveLength(2);
        expect(parsed.data.count).toBe(2);
        // R14: top-level эхо убрано.
        expect('page' in parsed.data).toBe(false);
        expect('perPage' in parsed.data).toBe(false);
        // pagination (включая nextCursor/total/totalPages) доходит до клиента.
        expect(parsed.data.pagination.hasNextPage).toBe(true);
        expect(parsed.data.pagination.total).toBe(9);
        expect(parsed.data.pagination.nextCursor).toBe('c1:next');
      });

      it('прокидывает fetchAll/maxItems в фасад', async () => {
        vi.mocked(mockTrackerFacade.getQueues).mockResolvedValue(paginated([]));

        await tool.execute({ fetchAll: true, maxItems: 300, fields: ['id', 'key', 'name'] });

        expect(mockTrackerFacade.getQueues).toHaveBeenCalledWith(
          expect.objectContaining({ fetchAll: true, maxItems: 300 })
        );
      });

      it('возвращает ошибку валидации при конфликте cursor + fetchAll', async () => {
        const result = await tool.execute({
          cursor: 'c1:abc',
          fetchAll: true,
          fields: ['id', 'key', 'name'],
        });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(getTextContent(result)) as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });
    });
  });
});
