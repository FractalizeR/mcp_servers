import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MockHttpClient } from '@fractalizer/mcp-infrastructure';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import { GetComponentsOperation } from '#tracker_api/api_operations/component/get-components.operation.js';
import { createComponentFixture } from '#helpers/component.fixture.js';
import { EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';

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

  describe('execute (без пагинации)', () => {
    it('запрашивает корректный endpoint без query-параметров и возвращает все компоненты', async () => {
      const components = [
        createComponentFixture({ id: '1', name: 'Backend' }),
        createComponentFixture({ id: '2', name: 'Frontend' }),
      ];
      httpClient.setResponse('GET', '/v2/queues/QUEUE/components', components);

      const result = await operation.execute({ queueId: 'QUEUE' });

      const history = httpClient.getRequestHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({ method: 'GET', path: '/v2/queues/QUEUE/components' });
      // Один запрос без query-параметров пагинации.
      expect(history[0]?.params).toBeUndefined();
      expect(result.items).toHaveLength(2);
      // Эндпоинт не пагинируется → следующей страницы нет.
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.fetchedAll).toBe(true);
    });

    it('возвращает кеш для запроса', async () => {
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

    it('кеширует запрос после загрузки из API', async () => {
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
});
