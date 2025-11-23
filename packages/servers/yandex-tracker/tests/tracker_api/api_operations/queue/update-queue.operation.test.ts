import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@mcp-framework/infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { QueueWithUnknownFields } from '#tracker_api/entities/index.js';
import { UpdateQueueOperation } from '#tracker_api/api_operations/queue/update-queue.operation.js';
import { createQueueFixture } from '#helpers/queue.fixture.js';
import { createUpdateQueueDto } from '#helpers/queue-dto.fixture.js';
import { EntityCacheKey, EntityType } from '@mcp-framework/infrastructure';

describe('UpdateQueueOperation', () => {
  let operation: UpdateQueueOperation;
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
    } as unknown as IHttpClient;

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

    operation = new UpdateQueueOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should call httpClient.patch with correct endpoint and data', async () => {
      const updates = createUpdateQueueDto({ name: 'Updated Queue Name' });
      const mockQueue: QueueWithUnknownFields = createQueueFixture({
        key: 'TEST',
        name: 'Updated Queue Name',
      });
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockQueue);

      const result = await operation.execute({ queueId: 'TEST', updates });

      expect(mockHttpClient.patch).toHaveBeenCalledWith('/v3/queues/TEST', updates);
      expect(result).toEqual(mockQueue);
    });

    it('should update queue name', async () => {
      const updates = createUpdateQueueDto({ name: 'New Queue Name' });
      const mockQueue: QueueWithUnknownFields = createQueueFixture({
        key: 'PROJ',
        name: 'New Queue Name',
      });
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockQueue);

      const result = await operation.execute({ queueId: 'PROJ', updates });

      expect(result.name).toBe('New Queue Name');
    });

    it('should update queue description', async () => {
      const updates = createUpdateQueueDto({ description: 'New description' });
      const mockQueue: QueueWithUnknownFields = createQueueFixture({
        key: 'TEST',
        description: 'New description',
      });
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockQueue);

      const result = await operation.execute({ queueId: 'TEST', updates });

      expect(result.description).toBe('New description');
    });

    it('should update queue lead', async () => {
      const updates = createUpdateQueueDto({ lead: 'new-user-id' });
      const mockQueue: QueueWithUnknownFields = createQueueFixture({ key: 'TEST' });
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockQueue);

      await operation.execute({ queueId: 'TEST', updates });

      expect(mockHttpClient.patch).toHaveBeenCalledWith('/v3/queues/TEST', updates);
    });

    it('should update multiple fields at once', async () => {
      const updates = createUpdateQueueDto({
        name: 'Updated Name',
        description: 'Updated Description',
        lead: 'new-lead',
      });
      const mockQueue: QueueWithUnknownFields = createQueueFixture({
        key: 'PROJ',
        name: 'Updated Name',
        description: 'Updated Description',
      });
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockQueue);

      const result = await operation.execute({ queueId: 'PROJ', updates });

      expect(result).toMatchObject({
        name: 'Updated Name',
        description: 'Updated Description',
      });
    });

    it('should invalidate cache after update', async () => {
      const updates = createUpdateQueueDto({ name: 'Updated' });
      const mockQueue: QueueWithUnknownFields = createQueueFixture({ key: 'TEST' });
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockQueue);

      await operation.execute({ queueId: 'TEST', updates });

      const cacheKey = EntityCacheKey.createKey(EntityType.QUEUE, 'TEST');
      expect(mockCacheManager.delete).toHaveBeenCalledWith(cacheKey);
    });

    it('should handle API errors', async () => {
      const updates = createUpdateQueueDto({ name: 'Updated' });
      const error = new Error('Queue not found');
      vi.mocked(mockHttpClient.patch).mockRejectedValue(error);

      await expect(operation.execute({ queueId: 'NOTFOUND', updates })).rejects.toThrow(
        'Queue not found'
      );
    });

    it('should log info messages', async () => {
      const updates = createUpdateQueueDto({ name: 'Updated Queue' });
      const mockQueue: QueueWithUnknownFields = createQueueFixture({
        key: 'PROJ',
        name: 'Updated Queue',
      });
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockQueue);

      await operation.execute({ queueId: 'PROJ', updates });

      expect(mockLogger.info).toHaveBeenCalledWith('Обновление очереди: PROJ');
      expect(mockLogger.info).toHaveBeenCalledWith('Очередь успешно обновлена: PROJ');
    });

    it('should work with queue ID instead of key', async () => {
      const updates = createUpdateQueueDto({ name: 'Updated' });
      const mockQueue: QueueWithUnknownFields = createQueueFixture({ id: 'queue-123', key: 'Q1' });
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockQueue);

      await operation.execute({ queueId: 'queue-123', updates });

      expect(mockHttpClient.patch).toHaveBeenCalledWith('/v3/queues/queue-123', updates);
    });

    it('should handle empty updates object', async () => {
      const updates = {};
      const mockQueue: QueueWithUnknownFields = createQueueFixture({ key: 'TEST' });
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockQueue);

      const result = await operation.execute({ queueId: 'TEST', updates });

      expect(mockHttpClient.patch).toHaveBeenCalledWith('/v3/queues/TEST', {});
      expect(result).toEqual(mockQueue);
    });
  });
});
