/**
 * Unit тесты для GetIssueLinksOperation (batch + пагинация)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MockHttpClient } from '@fractalizer/mcp-infrastructure';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { ServerConfig } from '#config';
import { GetIssueLinksOperation } from '#tracker_api/api_operations/link/get-issue-links.operation.js';
import { CursorCodec, CURSOR_TAGS, InvalidCursorError } from '#tracker_api/utils/index.js';
import { createLinkListFixture } from '#helpers/link.fixture.js';
import { at } from '#helpers/tool-result.helper.js';

describe('GetIssueLinksOperation', () => {
  let operation: GetIssueLinksOperation;
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

    operation = new GetIssueLinksOperation(
      httpClient as never,
      mockCacheManager,
      mockLogger,
      mockConfig
    );
  });

  describe('execute (batch, single page)', () => {
    it('возвращает BatchResult с PaginatedResult; без Link → fetchedAll=true', async () => {
      httpClient.setResponse('GET', '/v3/issues/TEST-1/links?perPage=50', createLinkListFixture(3));

      const results = await operation.execute(['TEST-1']);

      expect(results).toHaveLength(1);
      const results0 = at(results);
      expect(results0.status).toBe('fulfilled');
      if (results0.status === 'fulfilled') {
        expect(results0.value.items).toHaveLength(3);
        expect(results0.value.pagination.hasNextPage).toBe(false);
        expect(results0.value.pagination.fetchedAll).toBe(true);
      }
    });

    it('РЕГРЕССИЯ (план 3.3/3.4): без явного perPage, одна связь, Link rel=next всё равно есть → hasNextPage=false', async () => {
      httpClient.setResponse(
        'GET',
        '/v3/issues/TEST-1/links?perPage=50',
        createLinkListFixture(1),
        {
          link: '<https://api.tracker.yandex.net/v3/issues/TEST-1/links?page=2>; rel="next"',
        }
      );

      const results = await operation.execute(['TEST-1']);

      const results0 = at(results);
      if (results0.status === 'fulfilled') {
        expect(results0.value.pagination.hasNextPage).toBe(false);
        expect(results0.value.pagination.fetchedAll).toBe(true);
      } else {
        throw new Error('expected fulfilled');
      }
    });

    it('при заполненной ровно до perPage странице + Link rel=next → hasNextPage=true', async () => {
      httpClient.setResponse(
        'GET',
        '/v3/issues/TEST-1/links?perPage=50',
        createLinkListFixture(50),
        {
          link: '<https://api.tracker.yandex.net/v3/issues/TEST-1/links?page=2>; rel="next"',
        }
      );

      const results = await operation.execute(['TEST-1']);

      const results0 = at(results);
      if (results0.status === 'fulfilled') {
        expect(results0.value.pagination.hasNextPage).toBe(true);
      } else {
        throw new Error('expected fulfilled');
      }
    });

    it('обрабатывает несколько задач и частичные ошибки', async () => {
      httpClient.setResponse('GET', '/v3/issues/TEST-1/links?perPage=50', createLinkListFixture(2));
      // TEST-2 не замокан → rejected

      const results = await operation.execute(['TEST-1', 'TEST-2']);

      expect(results).toHaveLength(2);
      expect(at(results).status).toBe('fulfilled');
      expect(at(results, 1).status).toBe('rejected');
    });

    it('возвращает пустой массив для пустого входа', async () => {
      const results = await operation.execute([]);

      expect(results).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith('GetIssueLinksOperation: пустой массив ключей');
    });
  });

  describe('execute (fetchAll)', () => {
    it('обходит несколько страниц через Link rel=next', async () => {
      httpClient.setResponseQueue('GET', '/v3/issues/TEST-1/links?perPage=100', [
        {
          data: createLinkListFixture(1),
          headers: {
            link: '<https://api.tracker.yandex.net/v3/issues/TEST-1/links?page=2>; rel="next"',
          },
        },
      ]);
      httpClient.setResponseQueue('GET', '/v3/issues/TEST-1/links?page=2', [
        { data: createLinkListFixture(1) },
      ]);

      const results = await operation.execute(['TEST-1'], { fetchAll: true });

      const results0 = at(results);
      if (results0.status === 'fulfilled') {
        expect(results0.value.items).toHaveLength(2);
        expect(results0.value.pagination.fetchedAll).toBe(true);
        expect(results0.value.pagination.pagesFetched).toBe(2);
      }
    });

    it('обрезает выдачу по maxItems → truncated=true', async () => {
      httpClient.setResponse(
        'GET',
        '/v3/issues/TEST-1/links?perPage=100',
        createLinkListFixture(3),
        {
          link: '<https://api.tracker.yandex.net/v3/issues/TEST-1/links?page=2>; rel="next"',
        }
      );

      const results = await operation.execute(['TEST-1'], { fetchAll: true, maxItems: 2 });

      const results0 = at(results);
      if (results0.status === 'fulfilled') {
        expect(results0.value.items).toHaveLength(2);
        expect(results0.value.pagination.truncated).toBe(true);
      }
    });
  });

  describe('cursor pagination', () => {
    it('single-page выдаёт nextCursor, декодирование ведёт по next-пути', async () => {
      // Первая страница: есть Link rel=next → nextCursor определён. perPage=1
      // явно передан и совпадает с числом элементов — sanity-check (F3) не
      // гасит hasNextPage/nextCursor.
      httpClient.setResponse('GET', '/v3/issues/TEST-1/links?perPage=1', createLinkListFixture(1), {
        link: '<https://api.tracker.yandex.net/v3/issues/TEST-1/links?id=NEXT>; rel="next"',
      });

      const first = await operation.execute(['TEST-1'], { perPage: 1 });
      const first0 = at(first);
      expect(first0.status).toBe('fulfilled');
      if (first0.status !== 'fulfilled') {
        return;
      }
      const nextCursor = first0.value.pagination.nextCursor;
      expect(nextCursor).toBeDefined();

      // Курсор декодируется в относительный next-путь.
      const decoded = CursorCodec.decode(nextCursor as string, CURSOR_TAGS.links);
      expect(decoded.path).toBe('/v3/issues/TEST-1/links?id=NEXT');

      // Повторный вызов с курсором идёт по декодированному пути и отдаёт
      // следующие записи (без Link → последняя страница).
      httpClient.setResponse('GET', '/v3/issues/TEST-1/links?id=NEXT', createLinkListFixture(2));

      const second = await operation.execute(['TEST-1'], { cursor: nextCursor });
      const second0 = at(second);
      expect(second0.status).toBe('fulfilled');
      if (second0.status === 'fulfilled') {
        expect(second0.value.items).toHaveLength(2);
        expect(second0.value.pagination.hasNextPage).toBe(false);
        expect(second0.value.pagination.nextCursor).toBeUndefined();
      }
    });

    it('битый курсор → InvalidCursorError (без тихого fallback)', async () => {
      const results = await operation.execute(['TEST-1'], { cursor: 'broken-cursor' });

      const results0 = at(results);
      expect(results0.status).toBe('rejected');
      if (results0.status === 'rejected') {
        expect(results0.reason).toBeInstanceOf(InvalidCursorError);
      }
    });

    it('курсор чужого инструмента → InvalidCursorError', async () => {
      const alien = CursorCodec.encode('/v3/issues/TEST-1/comments?id=X', CURSOR_TAGS.comments);

      const results = await operation.execute(['TEST-1'], { cursor: alien });

      const results0 = at(results);
      expect(results0.status).toBe('rejected');
      if (results0.status === 'rejected') {
        expect(results0.reason).toBeInstanceOf(InvalidCursorError);
      }
    });

    it('с cursor НЕ используется кеш базового запроса (bypass)', async () => {
      const cursor = CursorCodec.encode('/v3/issues/TEST-1/links?id=NEXT', CURSOR_TAGS.links);
      httpClient.setResponse('GET', '/v3/issues/TEST-1/links?id=NEXT', createLinkListFixture(1));

      await operation.execute(['TEST-1'], { cursor });

      // Кеш базового запроса не должен читаться/писаться при курсорном листании,
      // иначе курсор вернул бы кешированную первую страницу.
      expect(mockCacheManager.get).not.toHaveBeenCalled();
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });

    it('базовый запрос (без cursor) использует кеш', async () => {
      httpClient.setResponse('GET', '/v3/issues/TEST-1/links?perPage=50', createLinkListFixture(1));

      await operation.execute(['TEST-1']);

      expect(mockCacheManager.get).toHaveBeenCalled();
    });
  });
});
