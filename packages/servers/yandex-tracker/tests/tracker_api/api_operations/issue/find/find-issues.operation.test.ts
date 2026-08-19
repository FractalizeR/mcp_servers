import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueueRef } from '#helpers/common-fixtures.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import { MockHttpClient } from '@fractalizer/mcp-infrastructure';
import type { IssueWithUnknownFields } from '#tracker_api/entities/index.js';
import type { FindIssuesInputDto } from '#tracker_api/dto/index.js';
import { FindIssuesOperation } from '#tracker_api/api_operations/issue/find/find-issues.operation.js';
import { CursorCodec, CURSOR_TAGS, InvalidCursorError } from '#tracker_api/utils/index.js';

describe('FindIssuesOperation (pagination)', () => {
  let operation: FindIssuesOperation;
  let httpClient: MockHttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;

  const mockIssue: IssueWithUnknownFields = {
    id: '1',
    key: 'TEST-123',
    summary: 'Test Issue',
    queue: createQueueRef({ id: '1', key: 'TEST', display: 'Test Queue' }),
    status: { id: '1', key: 'open', display: 'Open' },
    createdBy: {
      self: 'https://api.tracker.yandex.net/v3/users/user1',
      id: 'user1',
      display: 'User 1',
    },
    createdAt: '2024-01-01T10:00:00.000Z',
    updatedAt: '2024-01-01T10:00:00.000Z',
  };

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

    operation = new FindIssuesOperation(httpClient, mockCacheManager, mockLogger);
  });

  describe('single-page (без fetchAll)', () => {
    it('возвращает PaginatedResult без Link → hasNextPage=false', async () => {
      httpClient.setResponse('POST', '/v3/issues/_search', [mockIssue]);
      const params: FindIssuesInputDto = { query: 'status: open' };

      const result = await operation.execute(params);

      expect(result.items).toHaveLength(1);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.fetchedAll).toBe(true);
    });

    it('передаёт тело запроса в POST', async () => {
      httpClient.setResponse('POST', '/v3/issues/_search', [mockIssue]);

      await operation.execute({ query: 'status: open' });

      const history = httpClient.getRequestHistory();
      const post = history.find((r) => r.method === 'POST');
      expect(post?.path).toBe('/v3/issues/_search');
      expect(post?.data).toEqual({ query: 'status: open' });
    });

    it('строит query-string для perPage', async () => {
      httpClient.setResponse('POST', '/v3/issues/_search?perPage=50', [mockIssue]);

      const result = await operation.execute({ query: 'status: open', perPage: 50 });

      expect(result.items).toHaveLength(1);
      expect(result.pagination.perPage).toBe(50);
    });

    it('не возвращает top-level page в метаданных (cursor-режим)', async () => {
      httpClient.setResponse('POST', '/v3/issues/_search', [mockIssue]);

      const result = await operation.execute({ query: 'status: open' });

      expect(result.pagination).not.toHaveProperty('page');
    });

    it('с Link rel=next → hasNextPage=true и nextCursor определён', async () => {
      httpClient.setResponse('POST', '/v3/issues/_search', [mockIssue], {
        link: '<https://api.tracker.yandex.net/v3/issues/_search?page=2>; rel="next"',
      });

      const result = await operation.execute({ query: 'status: open' });

      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.fetchedAll).toBe(false);
      expect(result.pagination.nextCursor).toBeDefined();
    });

    it('обрабатывает expand', async () => {
      httpClient.setResponse('POST', '/v3/issues/_search?expand=transitions', [mockIssue]);

      const result = await operation.execute({ query: 'status: open', expand: ['transitions'] });

      expect(result.items).toHaveLength(1);
    });

    it('бросает ошибку, если способ поиска не указан', async () => {
      await expect(operation.execute({})).rejects.toThrow(
        'FindIssuesOperation: не указан способ поиска'
      );
    });

    it('пробрасывает HTTP-ошибки', async () => {
      // Мок-ответ не настроен → reject
      await expect(operation.execute({ query: 'invalid' })).rejects.toThrow();
    });

    it('транслирует queue → query "Queue: <queue>" при order (order игнорируется queue-фильтром)', async () => {
      httpClient.setResponse('POST', '/v3/issues/_search', [mockIssue]);

      await operation.execute({ queue: 'DVIZHDEV', order: ['-updatedAt'] });

      const history = httpClient.getRequestHistory();
      const post = history.find((r) => r.method === 'POST');
      expect(post?.data).toEqual({ query: 'Queue: DVIZHDEV', order: ['-updatedAt'] });
    });

    it('не транслирует queue без order (остаётся queue-фильтр)', async () => {
      httpClient.setResponse('POST', '/v3/issues/_search', [mockIssue]);

      await operation.execute({ queue: 'DVIZHDEV' });

      const history = httpClient.getRequestHistory();
      const post = history.find((r) => r.method === 'POST');
      expect(post?.data).toEqual({ queue: 'DVIZHDEV' });
    });

    it('не транслирует queue при order, если уже задан query', async () => {
      httpClient.setResponse('POST', '/v3/issues/_search', [mockIssue]);

      await operation.execute({ query: 'Status: open', queue: 'DVIZHDEV', order: ['-updatedAt'] });

      const history = httpClient.getRequestHistory();
      const post = history.find((r) => r.method === 'POST');
      expect(post?.data).toEqual({
        query: 'Status: open',
        queue: 'DVIZHDEV',
        order: ['-updatedAt'],
      });
    });
  });

  describe('fetchAll', () => {
    it('обходит страницы по Link rel=next (cursor)', async () => {
      // Первая страница (perPage поднят к 100) с Link
      httpClient.setResponse('POST', '/v3/issues/_search?perPage=100', [mockIssue], {
        link: '<https://api.tracker.yandex.net/v3/issues/_search?page=2>; rel="next"',
      });
      // Вторая страница по next-URL
      httpClient.setResponse('POST', '/v3/issues/_search?page=2', [
        { ...mockIssue, key: 'TEST-124' },
      ]);

      const result = await operation.execute({ query: 'status: open', fetchAll: true });

      expect(result.items).toHaveLength(2);
      expect(result.pagination.pagesFetched).toBe(2);
      expect(result.pagination.fetchedAll).toBe(true);
    });

    it('обрезает по maxItems (truncated=true)', async () => {
      httpClient.setResponse(
        'POST',
        '/v3/issues/_search?perPage=100',
        [mockIssue, { ...mockIssue, key: 'TEST-124' }],
        {
          link: '<https://api.tracker.yandex.net/v3/issues/_search?page=2>; rel="next"',
        }
      );

      const result = await operation.execute({
        query: 'status: open',
        fetchAll: true,
        maxItems: 1,
      });

      expect(result.items).toHaveLength(1);
      expect(result.pagination.truncated).toBe(true);
    });

    it('перебирает page=1..N по X-Total-Pages, если нет Link (DP-5)', async () => {
      // Первая страница: нет Link, но X-Total-Pages=2
      httpClient.setResponse('POST', '/v3/issues/_search?perPage=100', [mockIssue], {
        'x-total-pages': '2',
      });
      // Вторая страница по page=2
      httpClient.setResponse('POST', '/v3/issues/_search?perPage=100&page=2', [
        { ...mockIssue, key: 'TEST-124' },
      ]);

      const result = await operation.execute({ query: 'status: open', fetchAll: true });

      expect(result.items).toHaveLength(2);
      expect(result.pagination.pagesFetched).toBe(2);
    });

    it('полный обход page-режима с X-Total-Count: fetchedAll=true, hasNextPage=false (регрессия H1)', async () => {
      // Seekable-ответ присылает Link rel="seek" + X-Total-Count + X-Total-Pages.
      // Нет rel="next" → fallback по X-Total-Pages. total берётся из seek-заголовков.
      httpClient.setResponse('POST', '/v3/issues/_search?perPage=100', [mockIssue], {
        link: '<https://api.tracker.yandex.net/v3/issues/_search?{&page}>; rel="seek"',
        'x-total-count': '2',
        'x-total-pages': '2',
      });
      httpClient.setResponse('POST', '/v3/issues/_search?perPage=100&page=2', [
        { ...mockIssue, key: 'TEST-124' },
      ]);

      const result = await operation.execute({ query: 'status: open', fetchAll: true });

      expect(result.items).toHaveLength(2);
      expect(result.pagination.pagesFetched).toBe(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.truncated).toBe(false);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.fetchedAll).toBe(true);
    });

    it('одна страница, если нет ни Link, ни X-Total-Pages>1', async () => {
      httpClient.setResponse('POST', '/v3/issues/_search?perPage=100', [mockIssue]);

      const result = await operation.execute({ query: 'status: open', fetchAll: true });

      expect(result.items).toHaveLength(1);
      expect(result.pagination.pagesFetched).toBe(1);
      expect(result.pagination.fetchedAll).toBe(true);
    });

    it('Link только с rel=seek (без next) → fallback на X-Total-Pages', async () => {
      // Регрессия: проверяем rel="next", а не наличие любого Link. Иначе
      // cursor-обход вернул бы одну страницу, минуя перебор по X-Total-Pages.
      httpClient.setResponse('POST', '/v3/issues/_search?perPage=100', [mockIssue], {
        link: '<https://api.tracker.yandex.net/v3/issues/_search?{&page}>; rel="seek"',
        'x-total-pages': '2',
      });
      httpClient.setResponse('POST', '/v3/issues/_search?perPage=100&page=2', [
        { ...mockIssue, key: 'TEST-124' },
      ]);

      const result = await operation.execute({ query: 'status: open', fetchAll: true });

      expect(result.items).toHaveLength(2);
      expect(result.pagination.pagesFetched).toBe(2);
    });

    it('прокидывает expand на страницы 2..N в page-режиме', async () => {
      httpClient.setResponse(
        'POST',
        '/v3/issues/_search?perPage=100&expand=transitions',
        [mockIssue],
        {
          'x-total-pages': '2',
        }
      );
      httpClient.setResponse('POST', '/v3/issues/_search?perPage=100&page=2&expand=transitions', [
        { ...mockIssue, key: 'TEST-124' },
      ]);

      const result = await operation.execute({
        query: 'status: open',
        fetchAll: true,
        expand: ['transitions'],
      });

      expect(result.items).toHaveLength(2);
      expect(httpClient.getRequestHistory()).toContainEqual(
        expect.objectContaining({
          path: '/v3/issues/_search?perPage=100&page=2&expand=transitions',
        })
      );
    });
  });

  describe('cursor (R2: хеш тела)', () => {
    it('первая страница с Link rel=next+seek → nextCursor, total, decode даёт path+hash; cursor листает дальше', async () => {
      // Первая POST-страница: rel="next" (cursor-обход) + rel="seek" (total) + X-Total.
      httpClient.setResponse('POST', '/v3/issues/_search', [mockIssue], {
        link:
          '<https://api.tracker.yandex.net/v3/issues/_search?page=2>; rel="next", ' +
          '<https://api.tracker.yandex.net/v3/issues/_search?{&page}>; rel="seek"',
        'x-total-count': '2',
      });

      const first = await operation.execute({ query: 'status: open' });

      expect(first.pagination.nextCursor).toBeDefined();
      expect(first.pagination.total).toBe(2);

      const decoded = CursorCodec.decode(
        first.pagination.nextCursor as string,
        CURSOR_TAGS.findIssues
      );
      expect(decoded.path).toBe('/v3/issues/_search?page=2');
      expect(decoded.extra).toBeDefined();

      // Повторный вызов с тем же query + cursor: POST по декодированному пути,
      // тем же телом, отдаёт следующие записи.
      httpClient.setResponse('POST', '/v3/issues/_search?page=2', [
        { ...mockIssue, key: 'TEST-124' },
      ]);

      const second = await operation.execute({
        query: 'status: open',
        cursor: first.pagination.nextCursor as string,
      });

      expect(second.items).toHaveLength(1);
      expect(second.items[0]?.key).toBe('TEST-124');

      const history = httpClient.getRequestHistory();
      const cursorPost = history.find((r) => r.path === '/v3/issues/_search?page=2');
      expect(cursorPost?.data).toEqual({ query: 'status: open' });
    });

    it('дописывает expand к декодированному пути курсора', async () => {
      httpClient.setResponse('POST', '/v3/issues/_search', [mockIssue], {
        link: '<https://api.tracker.yandex.net/v3/issues/_search?page=2>; rel="next"',
      });
      const first = await operation.execute({ query: 'status: open' });

      httpClient.setResponse('POST', '/v3/issues/_search?page=2&expand=transitions', [
        { ...mockIssue, key: 'TEST-124' },
      ]);

      const second = await operation.execute({
        query: 'status: open',
        cursor: first.pagination.nextCursor as string,
        expand: ['transitions'],
      });

      expect(second.items).toHaveLength(1);
      expect(httpClient.getRequestHistory()).toContainEqual(
        expect.objectContaining({ path: '/v3/issues/_search?page=2&expand=transitions' })
      );
    });

    it('сверка хеша: курсор от одних критериев + другой query → throw (mismatch)', async () => {
      httpClient.setResponse('POST', '/v3/issues/_search', [mockIssue], {
        link: '<https://api.tracker.yandex.net/v3/issues/_search?page=2>; rel="next"',
      });
      const first = await operation.execute({ query: 'status: open' });

      await expect(
        operation.execute({
          query: 'status: closed',
          cursor: first.pagination.nextCursor as string,
        })
      ).rejects.toThrow('Критерии поиска не совпадают с курсором');
    });

    it('битый курсор → InvalidCursorError', async () => {
      await expect(
        operation.execute({ query: 'status: open', cursor: 'not-a-valid-cursor' })
      ).rejects.toThrow(InvalidCursorError);
    });

    it('курсор требует переданный способ поиска (validateSearchMethod)', async () => {
      // Валидный по форме курсор, но без критериев — отказ ещё до decode.
      const cursor = CursorCodec.encode('/v3/issues/_search?page=2', CURSOR_TAGS.findIssues, 'x');
      await expect(operation.execute({ cursor })).rejects.toThrow(
        'FindIssuesOperation: не указан способ поиска'
      );
    });
  });
});
