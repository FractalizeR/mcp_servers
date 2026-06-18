import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MockHttpClient } from '@fractalizer/mcp-infrastructure/http/client/mock-http-client.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { QueueWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetQueuesOperation } from '#tracker_api/api_operations/queue/get-queues.operation.js';
import { createQueueFixture, createQueueListFixture } from '#helpers/queue.fixture.js';

const NEXT_LINK = '<https://api.tracker.yandex.net/v3/queues?perPage=100&page=2>; rel="next"';

describe('GetQueuesOperation', () => {
  let operation: GetQueuesOperation;
  let httpClient: MockHttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;

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

    operation = new GetQueuesOperation(httpClient, mockCacheManager, mockLogger);
  });

  describe('execute (single-page)', () => {
    it('строит endpoint с дефолтами perPage=50&page=1', async () => {
      const mockQueues: QueueWithUnknownFields[] = createQueueListFixture(3);
      httpClient.setResponse('GET', '/v3/queues?perPage=50&page=1', mockQueues);

      const result = await operation.execute();

      expect(result.items).toEqual(mockQueues);
      const history = httpClient.getRequestHistory();
      expect(history[0]?.path).toBe('/v3/queues?perPage=50&page=1');
    });

    it('без Link rel=next: hasNextPage=false, fetchedAll=true', async () => {
      httpClient.setResponse('GET', '/v3/queues?perPage=50&page=1', createQueueListFixture(2));

      const result = await operation.execute();

      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.fetchedAll).toBe(true);
      expect(result.pagination.pagesFetched).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.perPage).toBe(50);
    });

    it('с Link rel=next: hasNextPage=true', async () => {
      httpClient.setResponse('GET', '/v3/queues?perPage=50&page=1', createQueueListFixture(50), {
        link: NEXT_LINK,
      });

      const result = await operation.execute();

      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.fetchedAll).toBe(false);
    });

    it('читает total из X-Total-Count', async () => {
      httpClient.setResponse('GET', '/v3/queues?perPage=50&page=1', createQueueListFixture(2), {
        'x-total-count': '42',
      });

      const result = await operation.execute();

      expect(result.pagination.total).toBe(42);
    });

    it('пробрасывает expand и page/perPage в endpoint', async () => {
      httpClient.setResponse(
        'GET',
        '/v3/queues?perPage=100&page=2&expand=projects',
        createQueueListFixture(1)
      );

      await operation.execute({ perPage: 100, page: 2, expand: 'projects' });

      const history = httpClient.getRequestHistory();
      expect(history[0]?.path).toBe('/v3/queues?perPage=100&page=2&expand=projects');
    });

    it('пробрасывает API-ошибку', async () => {
      // ответ не сконфигурирован → reject
      await expect(operation.execute()).rejects.toThrow();
    });

    it('возвращает корректную структуру очередей', async () => {
      const mockQueue = createQueueFixture({ key: 'TEST', name: 'Test Queue', version: 1 });
      httpClient.setResponse('GET', '/v3/queues?perPage=50&page=1', [mockQueue]);

      const result = await operation.execute();

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({ key: 'TEST', name: 'Test Queue', version: 1 });
    });
  });

  describe('execute (fetchAll)', () => {
    it('обходит несколько страниц через Link rel=next', async () => {
      const page1 = createQueueListFixture(2);
      const page2 = createQueueListFixture(2);
      httpClient.setResponseQueue('GET', '/v3/queues?perPage=100&page=1', [
        { data: page1, headers: { link: NEXT_LINK } },
      ]);
      httpClient.setResponseQueue('GET', '/v3/queues?perPage=100&page=2', [{ data: page2 }]);

      const result = await operation.execute({ fetchAll: true });

      expect(result.items).toHaveLength(4);
      expect(result.pagination.pagesFetched).toBe(2);
      expect(result.pagination.fetchedAll).toBe(true);
      expect(result.pagination.hasNextPage).toBe(false);
    });

    it('режет выдачу по maxItems и ставит truncated=true', async () => {
      const page1 = createQueueListFixture(3);
      httpClient.setResponse('GET', '/v3/queues?perPage=100&page=1', page1, { link: NEXT_LINK });

      const result = await operation.execute({ fetchAll: true, maxItems: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.pagination.truncated).toBe(true);
      expect(result.pagination.hasNextPage).toBe(true);
    });
  });
});
