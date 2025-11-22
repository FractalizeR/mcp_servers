import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@mcp-framework/infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { ComponentsListOutput } from '#tracker_api/dto/index.js';
import { GetComponentsOperation } from '#tracker_api/api_operations/component/get-components.operation.js';
import { createComponentFixture } from '#helpers/component.fixture.js';
import { EntityCacheKey, EntityType } from '@mcp-framework/infrastructure';

describe('GetComponentsOperation', () => {
  let operation: GetComponentsOperation;
  let mockHttpClient: IHttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn().mockResolvedValue(null),
      post: vi.fn(),
      patch: vi.fn(),
      put: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
    } as unknown as HttpClient;

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

    operation = new GetComponentsOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should call httpClient.get with correct endpoint', async () => {
      const mockComponents: ComponentsListOutput = [
        createComponentFixture({ id: '1', name: 'Backend' }),
        createComponentFixture({ id: '2', name: 'Frontend' }),
      ];

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockComponents);

      const result = await operation.execute('QUEUE');

      expect(mockHttpClient.get).toHaveBeenCalledWith('/v2/queues/QUEUE/components');
      expect(result).toEqual(mockComponents);
    });

    it('should return cached components if available', async () => {
      const mockComponents: ComponentsListOutput = [
        createComponentFixture({ id: '1', name: 'Cached Component' }),
      ];

      const cacheKey = EntityCacheKey.createKey(EntityType.QUEUE, 'QUEUE/components');
      vi.mocked(mockCacheManager.get).mockResolvedValue(mockComponents);

      const result = await operation.execute('QUEUE');

      expect(mockCacheManager.get).toHaveBeenCalledWith(cacheKey);
      expect(mockHttpClient.get).not.toHaveBeenCalled();
      expect(result).toEqual(mockComponents);
    });

    it('should cache components after fetching from API', async () => {
      const mockComponents: ComponentsListOutput = [
        createComponentFixture({ id: '1', name: 'Component 1' }),
        createComponentFixture({ id: '2', name: 'Component 2' }),
      ];

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockComponents);

      await operation.execute('TEST');

      const cacheKey = EntityCacheKey.createKey(EntityType.QUEUE, 'TEST/components');
      expect(mockCacheManager.set).toHaveBeenCalledWith(cacheKey, mockComponents);
    });

    it('should work with queue ID instead of key', async () => {
      const mockComponents: ComponentsListOutput = [
        createComponentFixture({ id: '1', name: 'Component' }),
      ];

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockComponents);

      await operation.execute('queue-123');

      expect(mockHttpClient.get).toHaveBeenCalledWith('/v2/queues/queue-123/components');
    });

    it('should handle empty result', async () => {
      const emptyResult: ComponentsListOutput = [];
      vi.mocked(mockHttpClient.get).mockResolvedValue(emptyResult);

      const result = await operation.execute('EMPTY');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should handle API errors', async () => {
      const error = new Error('Queue not found');
      vi.mocked(mockHttpClient.get).mockRejectedValue(error);

      await expect(operation.execute('NOTFOUND')).rejects.toThrow('Queue not found');
    });

    it('should log info messages', async () => {
      const mockComponents: ComponentsListOutput = [
        createComponentFixture({ id: '1' }),
        createComponentFixture({ id: '2' }),
        createComponentFixture({ id: '3' }),
      ];
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockComponents);

      await operation.execute('QUEUE');

      expect(mockLogger.info).toHaveBeenCalledWith('Получение компонентов очереди QUEUE');
      expect(mockLogger.info).toHaveBeenCalledWith('Получено 3 компонентов для очереди QUEUE');
    });

    it('should log debug message when returning from cache', async () => {
      const mockComponents: ComponentsListOutput = [createComponentFixture()];

      vi.mocked(mockCacheManager.get).mockResolvedValue(mockComponents);

      await operation.execute('QUEUE');

      expect(mockLogger.debug).toHaveBeenCalledWith('Компоненты очереди QUEUE получены из кеша');
    });

    it('should return components with correct structure', async () => {
      const mockComponent = createComponentFixture({
        id: '1',
        name: 'Test Component',
        description: 'Test Description',
      });
      vi.mocked(mockHttpClient.get).mockResolvedValue([mockComponent]);

      const result = await operation.execute('QUEUE');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: '1',
        name: 'Test Component',
        description: 'Test Description',
      });
      expect(result[0]).toHaveProperty('self');
      expect(result[0]).toHaveProperty('queue');
    });

    it('should handle multiple components correctly', async () => {
      const mockComponents: ComponentsListOutput = [
        createComponentFixture({ id: '1', name: 'Backend' }),
        createComponentFixture({ id: '2', name: 'Frontend' }),
        createComponentFixture({ id: '3', name: 'Mobile' }),
        createComponentFixture({ id: '4', name: 'DevOps' }),
      ];
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockComponents);

      const result = await operation.execute('PROJ');

      expect(result).toHaveLength(4);
      expect(result[0].name).toBe('Backend');
      expect(result[1].name).toBe('Frontend');
      expect(result[2].name).toBe('Mobile');
      expect(result[3].name).toBe('DevOps');
    });
  });
});
