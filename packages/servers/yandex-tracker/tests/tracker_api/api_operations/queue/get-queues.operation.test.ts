import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MockHttpClient } from '@fractalizer/mcp-infrastructure/http/client/mock-http-client.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { QueueWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetQueuesOperation } from '#tracker_api/api_operations/queue/get-queues.operation.js';
import { createQueueFixture, createQueueListFixture } from '#helpers/queue.fixture.js';
import { CursorCodec, CURSOR_TAGS, InvalidCursorError } from '#tracker_api/utils/index.js';

const NEXT_LINK = '<https://api.tracker.yandex.net/v3/queues?perPage=100&page=2>; rel="next"';
// Seekable v3: ответ присылает И rel="next", И rel="seek" → total/totalPages сохраняются.
const NEXT_AND_SEEK_LINK =
  '<https://api.tracker.yandex.net/v3/queues?perPage=50&page=2>; rel="next", ' +
  '<https://api.tracker.yandex.net/v3/queues?{&page}>; rel="seek"';

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
    it('строит endpoint первой страницы с дефолтом perPage=50 (без page)', async () => {
      const mockQueues: QueueWithUnknownFields[] = createQueueListFixture(3);
      httpClient.setResponse('GET', '/v3/queues?perPage=50', mockQueues);

      const result = await operation.execute();

      expect(result.items).toEqual(mockQueues);
      const history = httpClient.getRequestHistory();
      expect(history[0]?.path).toBe('/v3/queues?perPage=50');
    });

    it('без Link rel=next: hasNextPage=false, fetchedAll=true, без nextCursor', async () => {
      httpClient.setResponse('GET', '/v3/queues?perPage=50', createQueueListFixture(2));

      const result = await operation.execute();

      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.fetchedAll).toBe(true);
      expect(result.pagination.pagesFetched).toBe(1);
      expect(result.pagination.perPage).toBe(50);
      expect(result.pagination.nextCursor).toBeUndefined();
      // Курсор-режим: legacy-поле page больше не выставляется.
      expect(result.pagination.page).toBeUndefined();
    });

    it('с Link rel=next: hasNextPage=true и появляется nextCursor', async () => {
      httpClient.setResponse('GET', '/v3/queues?perPage=50', createQueueListFixture(50), {
        link: NEXT_LINK,
      });

      const result = await operation.execute();

      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.fetchedAll).toBe(false);
      expect(result.pagination.nextCursor).toBeDefined();
    });

    it('seek-режим v3: total/totalPages сохраняются и nextCursor декодируется в next-путь', async () => {
      httpClient.setResponse('GET', '/v3/queues?perPage=50', createQueueListFixture(2), {
        link: NEXT_AND_SEEK_LINK,
        'x-total-count': '42',
        'x-total-pages': '5',
      });

      const result = await operation.execute();

      // seek присутствует → total/totalPages сохраняются.
      expect(result.pagination.total).toBe(42);
      expect(result.pagination.totalPages).toBe(5);
      // nextCursor декодируется в путь второй страницы.
      expect(result.pagination.nextCursor).toBeDefined();
      const decoded = CursorCodec.decode(
        result.pagination.nextCursor as string,
        CURSOR_TAGS.queues
      );
      expect(decoded.path).toBe('/v3/queues?perPage=50&page=2');
    });

    it('пробрасывает expand и perPage в endpoint первой страницы', async () => {
      httpClient.setResponse(
        'GET',
        '/v3/queues?perPage=100&expand=projects',
        createQueueListFixture(1)
      );

      await operation.execute({ perPage: 100, expand: 'projects' });

      const history = httpClient.getRequestHistory();
      expect(history[0]?.path).toBe('/v3/queues?perPage=100&expand=projects');
    });

    it('пробрасывает API-ошибку', async () => {
      await expect(operation.execute()).rejects.toThrow();
    });

    it('возвращает корректную структуру очередей', async () => {
      const mockQueue = createQueueFixture({ key: 'TEST', name: 'Test Queue', version: 1 });
      httpClient.setResponse('GET', '/v3/queues?perPage=50', [mockQueue]);

      const result = await operation.execute();

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({ key: 'TEST', name: 'Test Queue', version: 1 });
    });
  });

  describe('execute (cursor)', () => {
    it('повторный вызов с cursor идёт по декодированному пути (один запрос)', async () => {
      // Первая страница выдаёт nextCursor.
      httpClient.setResponse('GET', '/v3/queues?perPage=50', createQueueListFixture(2), {
        link: NEXT_AND_SEEK_LINK,
        'x-total-count': '42',
      });
      const first = await operation.execute();
      const cursor = first.pagination.nextCursor as string;
      expect(cursor).toBeDefined();

      // Вторая страница регистрируется под декодированным путём.
      const decoded = CursorCodec.decode(cursor, CURSOR_TAGS.queues);
      httpClient.setResponse('GET', decoded.path, createQueueListFixture(1));

      const second = await operation.execute({ cursor });

      expect(second.items).toHaveLength(1);
      const history = httpClient.getRequestHistory();
      // 2 запроса всего: первая страница + cursor-страница по точному пути.
      expect(history).toHaveLength(2);
      expect(history[1]?.path).toBe(decoded.path);
    });

    it('битый курсор → InvalidCursorError', async () => {
      await expect(operation.execute({ cursor: 'не-валидный-курсор' })).rejects.toThrow(
        InvalidCursorError
      );
    });
  });

  describe('execute (fetchAll)', () => {
    it('обходит несколько страниц через Link rel=next', async () => {
      const page1 = createQueueListFixture(2);
      const page2 = createQueueListFixture(2);
      httpClient.setResponseQueue('GET', '/v3/queues?perPage=100', [
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
      httpClient.setResponse('GET', '/v3/queues?perPage=100', page1, { link: NEXT_LINK });

      const result = await operation.execute({ fetchAll: true, maxItems: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.pagination.truncated).toBe(true);
      expect(result.pagination.hasNextPage).toBe(true);
    });
  });
});
