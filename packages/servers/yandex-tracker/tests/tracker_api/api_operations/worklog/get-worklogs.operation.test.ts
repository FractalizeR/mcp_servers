import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MockHttpClient } from '@fractalizer/mcp-infrastructure';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { WorklogWithUnknownFields } from '#tracker_api/entities/index.js';
import type { ServerConfig } from '#config';
import { GetWorklogsOperation } from '#tracker_api/api_operations/worklog/get-worklogs.operation.js';
import { CursorCodec, CURSOR_TAGS, InvalidCursorError } from '#tracker_api/utils/index.js';

/** Фабрика записи времени для тестов. */
function makeWorklog(id: string): WorklogWithUnknownFields {
  return {
    id,
    self: `https://api.tracker.yandex.net/v2/issues/TEST-1/worklog/${id}`,
    issue: { id: 'abc123', key: 'TEST-1', display: 'Test issue' },
    createdBy: {
      self: 'https://api.tracker.yandex.net/v2/users/1',
      id: '1',
      display: 'User 1',
    },
    createdAt: '2025-01-18T10:00:00.000+0000',
    start: '2025-01-18T09:00:00.000+0000',
    duration: 'PT1H',
  } as WorklogWithUnknownFields;
}

describe('GetWorklogsOperation', () => {
  let operation: GetWorklogsOperation;
  let httpClient: MockHttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;
  let mockConfig: ServerConfig;

  beforeEach(() => {
    httpClient = new MockHttpClient();

    mockCacheManager = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      has: vi.fn(),
    } as unknown as CacheManager;

    mockLogger = {
      child: vi.fn().mockReturnThis(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    mockConfig = {
      maxBatchSize: 100,
      maxConcurrentRequests: 5,
    } as ServerConfig;

    operation = new GetWorklogsOperation(
      httpClient as never,
      mockCacheManager,
      mockLogger,
      mockConfig
    );
  });

  describe('execute (single page)', () => {
    it('возвращает одну страницу без Link → hasNextPage=false, fetchedAll=true', async () => {
      httpClient.setResponse('GET', '/v2/issues/TEST-1/worklog?perPage=50', [makeWorklog('1')]);

      const result = await operation.execute('TEST-1');

      expect(result.items).toHaveLength(1);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.fetchedAll).toBe(true);
      expect(result.pagination.pagesFetched).toBe(1);
    });

    it('РЕГРЕССИЯ (план 3.3/3.4): без явного perPage, одна запись, Link rel=next всё равно есть → hasNextPage=false', async () => {
      httpClient.setResponse('GET', '/v2/issues/TEST-1/worklog?perPage=50', [makeWorklog('1')], {
        link: '<https://api.tracker.yandex.net/v2/issues/TEST-1/worklog?page=2>; rel="next"',
      });

      const result = await operation.execute('TEST-1');

      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.fetchedAll).toBe(true);
    });

    it('при заполненной ровно до perPage странице + Link rel=next → hasNextPage=true', async () => {
      const fullPage = Array.from({ length: 50 }, (_, i) => makeWorklog(String(i + 1)));
      httpClient.setResponse('GET', '/v2/issues/TEST-1/worklog?perPage=50', fullPage, {
        link: '<https://api.tracker.yandex.net/v2/issues/TEST-1/worklog?page=2>; rel="next"',
      });

      const result = await operation.execute('TEST-1');

      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.fetchedAll).toBe(false);
    });

    it('пробрасывает perPage в путь запроса', async () => {
      httpClient.setResponse('GET', '/v2/issues/TEST-1/worklog?perPage=10', [makeWorklog('1')]);

      const result = await operation.execute('TEST-1', { perPage: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.pagination.perPage).toBe(10);
    });

    it('пробрасывает ошибку API', async () => {
      // путь без мока → MockHttpClient reject
      await expect(operation.execute('TEST-404')).rejects.toThrow();
    });
  });

  describe('execute (fetchAll)', () => {
    it('обходит несколько страниц через Link rel=next', async () => {
      httpClient.setResponseQueue('GET', '/v2/issues/TEST-1/worklog?perPage=100', [
        {
          data: [makeWorklog('1')],
          headers: {
            link: '<https://api.tracker.yandex.net/v2/issues/TEST-1/worklog?page=2>; rel="next"',
          },
        },
      ]);
      httpClient.setResponseQueue('GET', '/v2/issues/TEST-1/worklog?page=2', [
        { data: [makeWorklog('2')] },
      ]);

      const result = await operation.execute('TEST-1', { fetchAll: true });

      expect(result.items).toHaveLength(2);
      expect(result.pagination.fetchedAll).toBe(true);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.pagesFetched).toBe(2);
    });

    it('обрезает выдачу по maxItems → truncated=true', async () => {
      httpClient.setResponse(
        'GET',
        '/v2/issues/TEST-1/worklog?perPage=100',
        [makeWorklog('1'), makeWorklog('2'), makeWorklog('3')],
        {
          link: '<https://api.tracker.yandex.net/v2/issues/TEST-1/worklog?page=2>; rel="next"',
        }
      );

      const result = await operation.execute('TEST-1', { fetchAll: true, maxItems: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.pagination.truncated).toBe(true);
      expect(result.pagination.hasNextPage).toBe(true);
    });
  });

  describe('executeMany', () => {
    it('возвращает BatchResult с PaginatedResult в value', async () => {
      httpClient.setResponse('GET', '/v2/issues/TEST-1/worklog?perPage=50', [makeWorklog('1')]);
      httpClient.setResponse('GET', '/v2/issues/TEST-2/worklog?perPage=50', [makeWorklog('2')]);

      const results = await operation.executeMany(['TEST-1', 'TEST-2']);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('fulfilled');
      if (results[0].status === 'fulfilled') {
        expect(results[0].value.items).toHaveLength(1);
        expect(results[0].value.pagination.fetchedAll).toBe(true);
      }
    });

    it('обрабатывает частичные ошибки', async () => {
      httpClient.setResponse('GET', '/v2/issues/TEST-1/worklog?perPage=50', [makeWorklog('1')]);
      // TEST-2 не замокан → reject

      const results = await operation.executeMany(['TEST-1', 'TEST-2']);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
    });

    it('возвращает пустой массив для пустого входа', async () => {
      const results = await operation.executeMany([]);

      expect(results).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'GetWorklogsOperation: пустой массив идентификаторов'
      );
    });
  });

  describe('cursor pagination', () => {
    it('single-page выдаёт nextCursor, декодирование ведёт по next-пути', async () => {
      // Первая страница: есть Link rel=next → nextCursor определён. perPage=1
      // явно передан и совпадает с числом элементов — sanity-check (F3) не
      // гасит hasNextPage/nextCursor.
      httpClient.setResponse('GET', '/v2/issues/TEST-1/worklog?perPage=1', [makeWorklog('1')], {
        link: '<https://api.tracker.yandex.net/v2/issues/TEST-1/worklog?id=NEXT>; rel="next"',
      });

      const first = await operation.execute('TEST-1', { perPage: 1 });
      const nextCursor = first.pagination.nextCursor;
      expect(nextCursor).toBeDefined();

      // Курсор декодируется в относительный next-путь.
      const decoded = CursorCodec.decode(nextCursor as string, CURSOR_TAGS.worklog);
      expect(decoded.path).toBe('/v2/issues/TEST-1/worklog?id=NEXT');

      // Повторный вызов с курсором идёт по декодированному пути.
      httpClient.setResponse('GET', '/v2/issues/TEST-1/worklog?id=NEXT', [makeWorklog('2')]);

      const second = await operation.execute('TEST-1', { cursor: nextCursor });
      expect(second.items).toHaveLength(1);
      expect((second.items[0] as { id: string }).id).toBe('2');
      expect(second.pagination.hasNextPage).toBe(false);
      expect(second.pagination.nextCursor).toBeUndefined();
    });

    it('битый курсор → InvalidCursorError', async () => {
      await expect(operation.execute('TEST-1', { cursor: 'broken-cursor' })).rejects.toBeInstanceOf(
        InvalidCursorError
      );
    });

    it('курсор чужого инструмента → InvalidCursorError', async () => {
      const alien = CursorCodec.encode('/v3/issues/TEST-1/links?id=X', CURSOR_TAGS.links);

      await expect(operation.execute('TEST-1', { cursor: alien })).rejects.toBeInstanceOf(
        InvalidCursorError
      );
    });

    it('executeMany листает одну задачу по курсору', async () => {
      const cursor = CursorCodec.encode('/v2/issues/TEST-1/worklog?id=NEXT', CURSOR_TAGS.worklog);
      httpClient.setResponse('GET', '/v2/issues/TEST-1/worklog?id=NEXT', [makeWorklog('2')]);

      const results = await operation.executeMany(['TEST-1'], { cursor });

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('fulfilled');
      if (results[0].status === 'fulfilled') {
        expect(results[0].value.items).toHaveLength(1);
      }
    });
  });
});
