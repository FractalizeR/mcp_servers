import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MockHttpClient } from '@fractalizer/mcp-infrastructure';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { CommentWithUnknownFields } from '#tracker_api/entities/index.js';
import type { GetCommentsInput } from '#tracker_api/dto/index.js';
import type { ServerConfig } from '#config';
import { GetCommentsOperation } from '#tracker_api/api_operations/comment/get-comments.operation.js';

/** Фабрика тестового комментария. */
function makeComment(id: string, text = `Comment ${id}`): CommentWithUnknownFields {
  return {
    id,
    self: `https://api.tracker.yandex.net/v3/issues/TEST-1/comments/${id}`,
    text,
    createdBy: {
      self: `https://api.tracker.yandex.net/v3/users/${id}`,
      id,
      display: `User ${id}`,
    },
    createdAt: '2025-01-18T10:00:00.000+0000',
  };
}

/** Заголовок Link с rel="next" на указанную страницу. */
function nextLink(page: number): Record<string, string> {
  return {
    link: `<https://api.tracker.yandex.net/v3/issues/TEST-1/comments?page=${page}>; rel="next"`,
  };
}

describe('GetCommentsOperation', () => {
  let operation: GetCommentsOperation;
  let mockHttpClient: MockHttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;
  let mockConfig: ServerConfig;

  beforeEach(() => {
    mockHttpClient = new MockHttpClient();

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

    operation = new GetCommentsOperation(mockHttpClient, mockCacheManager, mockLogger, mockConfig);
  });

  describe('execute (single-page mode)', () => {
    it('should call correct endpoint and return PaginatedResult', async () => {
      const comments = [makeComment('1')];
      mockHttpClient.setResponse('GET', '/v3/issues/TEST-1/comments', comments);

      const result = await operation.execute('TEST-1');

      expect(result.items).toEqual(comments);
      expect(mockHttpClient.getRequestHistory()).toContainEqual(
        expect.objectContaining({ method: 'GET', path: '/v3/issues/TEST-1/comments' })
      );
    });

    it('should report hasNextPage=false / fetchedAll=true without Link header', async () => {
      mockHttpClient.setResponse('GET', '/v3/issues/TEST-1/comments', [makeComment('1')]);

      const result = await operation.execute('TEST-1');

      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.fetchedAll).toBe(true);
      expect(result.pagination.truncated).toBe(false);
      expect(result.pagination.pagesFetched).toBe(1);
    });

    it('should report hasNextPage=true when Link rel=next present', async () => {
      mockHttpClient.setResponse(
        'GET',
        '/v3/issues/TEST-1/comments',
        [makeComment('1')],
        nextLink(2)
      );

      const result = await operation.execute('TEST-1');

      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.fetchedAll).toBe(false);
    });

    it('should pass pagination parameters to endpoint', async () => {
      mockHttpClient.setResponse('GET', '/v3/issues/PROJ-10/comments?perPage=50&page=2', []);

      const input: GetCommentsInput = { perPage: 50, page: 2 };
      const result = await operation.execute('PROJ-10', input);

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.perPage).toBe(50);
      expect(mockHttpClient.getRequestHistory()).toContainEqual(
        expect.objectContaining({ path: '/v3/issues/PROJ-10/comments?perPage=50&page=2' })
      );
    });

    it('should pass expand parameter to endpoint', async () => {
      mockHttpClient.setResponse('GET', '/v3/issues/TEST-2/comments?expand=attachments', []);

      const input: GetCommentsInput = { expand: 'attachments' };
      await operation.execute('TEST-2', input);

      expect(mockHttpClient.getRequestHistory()).toContainEqual(
        expect.objectContaining({ path: '/v3/issues/TEST-2/comments?expand=attachments' })
      );
    });

    it('should normalize non-array response to array', async () => {
      const single = makeComment('1', 'Single comment');
      mockHttpClient.setResponse('GET', '/v3/issues/TEST-1/comments', single);

      const result = await operation.execute('TEST-1');

      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(single);
    });

    it('should propagate API errors', async () => {
      await expect(operation.execute('UNKNOWN-1')).rejects.toThrow();
    });
  });

  describe('execute (fetchAll mode)', () => {
    it('should traverse all pages via Link rel=next', async () => {
      // Первая страница (perPage поднят к максимуму endpoint'а comments = 500)
      mockHttpClient.setResponse(
        'GET',
        '/v3/issues/TEST-1/comments?perPage=500',
        [makeComment('1'), makeComment('2')],
        nextLink(2)
      );
      // Вторая (последняя) страница — без Link
      mockHttpClient.setResponse('GET', '/v3/issues/TEST-1/comments?page=2', [makeComment('3')]);

      const result = await operation.execute('TEST-1', { fetchAll: true });

      expect(result.items.map((c) => c.id)).toEqual(['1', '2', '3']);
      expect(result.pagination.fetchedAll).toBe(true);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.pagesFetched).toBe(2);
      expect(result.pagination.truncated).toBe(false);
    });

    it('should truncate by maxItems', async () => {
      mockHttpClient.setResponse(
        'GET',
        '/v3/issues/TEST-1/comments?perPage=500',
        [makeComment('1'), makeComment('2'), makeComment('3')],
        nextLink(2)
      );

      const result = await operation.execute('TEST-1', { fetchAll: true, maxItems: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.pagination.truncated).toBe(true);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.fetchedAll).toBe(false);
    });
  });

  describe('executeMany', () => {
    it('should get comments for multiple issues returning PaginatedResult', async () => {
      mockHttpClient.setResponse('GET', '/v3/issues/TEST-1/comments', [makeComment('1')]);
      mockHttpClient.setResponse('GET', '/v3/issues/TEST-2/comments', [makeComment('2')]);

      const result = await operation.executeMany(['TEST-1', 'TEST-2']);

      expect(result).toHaveLength(2);
      expect(result[0]?.status).toBe('fulfilled');
      expect(result[0]?.key).toBe('TEST-1');
      if (result[0]?.status === 'fulfilled') {
        expect(result[0].value.items).toHaveLength(1);
        expect(result[0].value.pagination.hasNextPage).toBe(false);
      }
      expect(result[1]?.status).toBe('fulfilled');
      if (result[1]?.status === 'fulfilled') {
        expect(result[1].value.items[0]?.id).toBe('2');
      }
    });

    it('should handle partial failures', async () => {
      mockHttpClient.setResponse('GET', '/v3/issues/TEST-1/comments', [makeComment('1')]);
      // TEST-2 не сконфигурирован → MockHttpClient отклонит

      const result = await operation.executeMany(['TEST-1', 'TEST-2']);

      expect(result).toHaveLength(2);
      expect(result[0]?.status).toBe('fulfilled');
      expect(result[1]?.status).toBe('rejected');
    });

    it('should return empty result for empty array', async () => {
      const result = await operation.executeMany([]);

      expect(result).toEqual([]);
      expect(mockHttpClient.getRequestHistory()).toHaveLength(0);
    });

    it('should log batch operation start', async () => {
      mockHttpClient.setResponse('GET', '/v3/issues/TEST-1/comments', []);
      mockHttpClient.setResponse('GET', '/v3/issues/TEST-2/comments', []);

      await operation.executeMany(['TEST-1', 'TEST-2']);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Получение комментариев для 2 задач параллельно: TEST-1, TEST-2'
      );
    });

    it('maxTotalItems ограничивает суммарную выдачу batch-ответа (fetchAll)', async () => {
      // Две задачи по 2 комментария; общий потолок 3 → суммарно ровно 3.
      mockHttpClient.setResponse('GET', '/v3/issues/TEST-1/comments?perPage=500', [
        makeComment('1'),
        makeComment('2'),
      ]);
      mockHttpClient.setResponse('GET', '/v3/issues/TEST-2/comments?perPage=500', [
        makeComment('3'),
        makeComment('4'),
      ]);

      const result = await operation.executeMany(['TEST-1', 'TEST-2'], {
        fetchAll: true,
        maxTotalItems: 3,
      });

      const totalItems = result.reduce(
        (sum, r) => sum + (r.status === 'fulfilled' ? r.value.items.length : 0),
        0
      );
      expect(totalItems).toBe(3);
      // одна из задач обрезана по исчерпанию общего бюджета
      const truncatedCount = result.filter(
        (r) => r.status === 'fulfilled' && r.value.pagination.truncated
      ).length;
      expect(truncatedCount).toBe(1);
    });
  });
});
