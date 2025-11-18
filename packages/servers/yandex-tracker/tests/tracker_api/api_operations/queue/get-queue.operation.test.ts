import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '@mcp-framework/infrastructure/http/client/http-client.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { QueueWithUnknownFields } from '@tracker_api/entities/index.js';
import { GetQueueOperation } from '@tracker_api/api_operations/queue/get-queue.operation.js';
import { createQueueFixture } from '../../../helpers/queue.fixture.js';
import { EntityCacheKey, EntityType } from '@mcp-framework/infrastructure';

describe('GetQueueOperation', () => {
  let operation: GetQueueOperation;
  let mockHttpClient: HttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as unknown as HttpClient;

    mockCacheManager = {
      get: vi.fn().mockReturnValue(undefined), // По умолчанию кеш пустой (undefined, синхронно)
      set: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      has: vi.fn(),
    } as unknown as CacheManager;

    mockLogger = {
      child: vi.fn().mockReturnThis(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    operation = new GetQueueOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should call httpClient.get with correct endpoint', async () => {
      const mockQueue: QueueWithUnknownFields = createQueueFixture({ key: 'TEST' });
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockQueue);

      const result = await operation.execute({ queueId: 'TEST' });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/queues/TEST');
      expect(result).toEqual(mockQueue);
    });

    it('should pass expand parameter', async () => {
      const mockQueue: QueueWithUnknownFields = createQueueFixture({ key: 'PROJ' });
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockQueue);

      await operation.execute({ queueId: 'PROJ', expand: 'projects' });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/queues/PROJ?expand=projects');
    });

    it('should cache queue by its key', async () => {
      const mockQueue: QueueWithUnknownFields = createQueueFixture({ key: 'TEST' });
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockQueue);

      await operation.execute({ queueId: 'TEST' });

      const cacheKey = EntityCacheKey.createKey(EntityType.QUEUE, 'TEST');
      expect(mockCacheManager.set).toHaveBeenCalledWith(cacheKey, mockQueue);
    });

    it('should return cached queue if available', async () => {
      const cachedQueue: QueueWithUnknownFields = createQueueFixture({ key: 'CACHED' });
      const cacheKey = EntityCacheKey.createKey(EntityType.QUEUE, 'CACHED');
      vi.mocked(mockCacheManager.get).mockReturnValue(cachedQueue); // синхронный возврат

      const result = await operation.execute({ queueId: 'CACHED' });

      expect(mockCacheManager.get).toHaveBeenCalledWith(cacheKey);
      expect(mockHttpClient.get).not.toHaveBeenCalled(); // Не должен вызывать API
      expect(result).toEqual(cachedQueue);
    });

    it('should handle API errors', async () => {
      const error = new Error('Queue not found');
      vi.mocked(mockHttpClient.get).mockRejectedValue(error);

      await expect(operation.execute({ queueId: 'NOTFOUND' })).rejects.toThrow('Queue not found');
    });

    it('should log info messages', async () => {
      const mockQueue: QueueWithUnknownFields = createQueueFixture({ key: 'PROJ' });
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockQueue);

      await operation.execute({ queueId: 'PROJ' });

      expect(mockLogger.info).toHaveBeenCalledWith('Получение очереди: PROJ');
      expect(mockLogger.info).toHaveBeenCalledWith('Очередь получена: PROJ');
    });

    it('should return queue with correct structure', async () => {
      const mockQueue = createQueueFixture({
        key: 'TEST',
        name: 'Test Queue',
        version: 1,
        description: 'Test Description',
      });
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockQueue);

      const result = await operation.execute({ queueId: 'TEST' });

      expect(result).toMatchObject({
        key: 'TEST',
        name: 'Test Queue',
        version: 1,
        description: 'Test Description',
      });
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('self');
      expect(result).toHaveProperty('lead');
      expect(result).toHaveProperty('defaultType');
      expect(result).toHaveProperty('defaultPriority');
    });

    it('should work with queue ID instead of key', async () => {
      const mockQueue: QueueWithUnknownFields = createQueueFixture({ id: 'queue-123', key: 'Q1' });
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockQueue);

      await operation.execute({ queueId: 'queue-123' });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/queues/queue-123');
    });
  });
});
