import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MockHttpClient } from '@fractalizer/mcp-infrastructure';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import { GetComponentsOperation } from '#tracker_api/api_operations/component/get-components.operation.js';
import { createComponentFixture } from '#helpers/component.fixture.js';
import { EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';

const NEXT_LINK = '<https://api.tracker.yandex.net/v2/queues/QUEUE/components?page=2>; rel="next"';

describe('GetComponentsOperation', () => {
  let operation: GetComponentsOperation;
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

    operation = new GetComponentsOperation(httpClient, mockCacheManager, mockLogger);
  });

  describe('execute (single page)', () => {
    it('запрашивает корректный endpoint и возвращает PaginatedResult без next', async () => {
      const components = [
        createComponentFixture({ id: '1', name: 'Backend' }),
        createComponentFixture({ id: '2', name: 'Frontend' }),
      ];
      httpClient.setResponse('GET', '/v2/queues/QUEUE/components', components);

      const result = await operation.execute({ queueId: 'QUEUE' });

      const history = httpClient.getRequestHistory();
      expect(history[0]).toMatchObject({ method: 'GET', path: '/v2/queues/QUEUE/components' });
      expect(result.items).toHaveLength(2);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.fetchedAll).toBe(true);
    });

    it('выставляет hasNextPage=true при наличии Link rel="next"', async () => {
      httpClient.setResponse(
        'GET',
        '/v2/queues/QUEUE/components',
        [createComponentFixture({ id: '1' })],
        { link: NEXT_LINK }
      );

      const result = await operation.execute({ queueId: 'QUEUE' });

      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.fetchedAll).toBe(false);
    });

    it('пробрасывает page/perPage в query', async () => {
      httpClient.setResponse('GET', '/v2/queues/PROJ/components', []);

      await operation.execute({ queueId: 'PROJ', page: 2, perPage: 10 });

      const history = httpClient.getRequestHistory();
      expect(history[0]?.params).toEqual({ page: 2, perPage: 10 });
    });

    it('возвращает кеш для базового запроса (без параметров пагинации)', async () => {
      const cached = {
        items: [createComponentFixture({ id: '1' })],
        pagination: {
          hasNextPage: false,
          fetchedAll: true,
          truncated: false,
          hasError: false,
          pagesFetched: 1,
        },
      };
      const cacheKey = EntityCacheKey.createKey(EntityType.QUEUE, 'QUEUE/components');
      vi.mocked(mockCacheManager.get).mockResolvedValue(cached);

      const result = await operation.execute({ queueId: 'QUEUE' });

      expect(mockCacheManager.get).toHaveBeenCalledWith(cacheKey);
      expect(httpClient.getRequestHistory()).toHaveLength(0);
      expect(result).toEqual(cached);
    });

    it('кеширует базовый запрос после загрузки из API', async () => {
      httpClient.setResponse('GET', '/v2/queues/TEST/components', [
        createComponentFixture({ id: '1' }),
      ]);

      await operation.execute({ queueId: 'TEST' });

      const cacheKey = EntityCacheKey.createKey(EntityType.QUEUE, 'TEST/components');
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        cacheKey,
        expect.objectContaining({ items: expect.any(Array) })
      );
    });

    it('НЕ использует кеш при заданных параметрах пагинации (кеш-аудит)', async () => {
      httpClient.setResponse('GET', '/v2/queues/QUEUE/components', [
        createComponentFixture({ id: '1' }),
      ]);

      await operation.execute({ queueId: 'QUEUE', page: 2 });

      expect(mockCacheManager.get).not.toHaveBeenCalled();
      expect(mockCacheManager.set).not.toHaveBeenCalled();
      expect(httpClient.getRequestHistory()).toHaveLength(1);
    });

    it('обрабатывает пустой результат', async () => {
      httpClient.setResponse('GET', '/v2/queues/EMPTY/components', []);

      const result = await operation.execute({ queueId: 'EMPTY' });

      expect(result.items).toHaveLength(0);
    });

    it('пробрасывает ошибки API', async () => {
      // нет настроенного ответа → MockHttpClient отклоняет промис
      await expect(operation.execute({ queueId: 'NOTFOUND' })).rejects.toThrow();
    });
  });

  describe('execute (fetchAll)', () => {
    it('обходит несколько страниц через Link rel="next"', async () => {
      // Первая страница (базовый путь) с Link на вторую страницу
      httpClient.setResponse(
        'GET',
        '/v2/queues/QUEUE/components',
        [createComponentFixture({ id: '1' })],
        { link: NEXT_LINK }
      );
      // Вторая страница регистрируется под путём с query (как его вернёт stripHost)
      httpClient.setResponse('GET', '/v2/queues/QUEUE/components?page=2', [
        createComponentFixture({ id: '2' }),
      ]);

      const result = await operation.execute({ queueId: 'QUEUE', fetchAll: true });

      expect(result.items).toHaveLength(2);
      expect(result.pagination.fetchedAll).toBe(true);
      expect(result.pagination.pagesFetched).toBe(2);
    });

    it('обрезает выдачу по maxItems и выставляет truncated', async () => {
      httpClient.setResponse(
        'GET',
        '/v2/queues/QUEUE/components',
        [createComponentFixture({ id: '1' }), createComponentFixture({ id: '2' })],
        { link: NEXT_LINK }
      );

      const result = await operation.execute({ queueId: 'QUEUE', fetchAll: true, maxItems: 1 });

      expect(result.items).toHaveLength(1);
      expect(result.pagination.truncated).toBe(true);
    });
  });
});
