import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { ComponentOutput } from '#tracker_api/dto/index.js';
import { DeleteComponentOperation } from '#tracker_api/api_operations/component/delete-component.operation.js';
import { createComponentFixture, createQueueRef } from '#helpers/component.fixture.js';
import { EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';

describe('DeleteComponentOperation', () => {
  let operation: DeleteComponentOperation;
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

    operation = new DeleteComponentOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should fetch component before deletion and then delete it', async () => {
      const mockComponent: ComponentOutput = createComponentFixture({
        id: '1',
        queue: createQueueRef({ id: 'queue-1' }),
      });
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockComponent);

      // Mock deleteRequest method (it's protected, so we test through execute)
      const deleteSpy = vi.spyOn(operation as any, 'deleteRequest').mockResolvedValue(undefined);

      await operation.execute('1');

      expect(mockHttpClient.get).toHaveBeenCalledWith('/v2/components/1');
      expect(deleteSpy).toHaveBeenCalledWith('/v2/components/1');
    });

    it('should invalidate component cache after deletion', async () => {
      const mockComponent: ComponentOutput = createComponentFixture({
        id: '1',
        queue: createQueueRef({ id: 'queue-1' }),
      });
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockComponent);
      vi.spyOn(operation as any, 'deleteRequest').mockResolvedValue(undefined);

      await operation.execute('1');

      const componentCacheKey = EntityCacheKey.createKey(EntityType.COMPONENT, '1');
      expect(mockCacheManager.delete).toHaveBeenCalledWith(componentCacheKey);
    });

    it('should invalidate components list cache after deletion', async () => {
      const mockComponent: ComponentOutput = createComponentFixture({
        id: '1',
        queue: createQueueRef({ id: 'queue-123' }),
      });
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockComponent);
      vi.spyOn(operation as any, 'deleteRequest').mockResolvedValue(undefined);

      await operation.execute('1');

      const listCacheKey = EntityCacheKey.createKey(EntityType.QUEUE, 'queue-123/components');
      expect(mockCacheManager.delete).toHaveBeenCalledWith(listCacheKey);
    });

    it('should continue deletion even if component GET fails', async () => {
      vi.mocked(mockHttpClient.get).mockRejectedValue(new Error('Component not found'));
      const deleteSpy = vi.spyOn(operation as any, 'deleteRequest').mockResolvedValue(undefined);

      await operation.execute('1');

      expect(deleteSpy).toHaveBeenCalledWith('/v2/components/1');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Не удалось получить компонент 1 перед удалением'
      );
    });

    it('should still invalidate component cache if GET fails', async () => {
      vi.mocked(mockHttpClient.get).mockRejectedValue(new Error('Component not found'));
      vi.spyOn(operation as any, 'deleteRequest').mockResolvedValue(undefined);

      await operation.execute('1');

      const componentCacheKey = EntityCacheKey.createKey(EntityType.COMPONENT, '1');
      expect(mockCacheManager.delete).toHaveBeenCalledWith(componentCacheKey);
    });

    it('should not invalidate list cache if queueId is unknown', async () => {
      vi.mocked(mockHttpClient.get).mockRejectedValue(new Error('Component not found'));
      vi.spyOn(operation as any, 'deleteRequest').mockResolvedValue(undefined);

      await operation.execute('1');

      // Should only delete component cache, not list cache
      expect(mockCacheManager.delete).toHaveBeenCalledTimes(1);
      expect(mockCacheManager.delete).toHaveBeenCalledWith(
        EntityCacheKey.createKey(EntityType.COMPONENT, '1')
      );
    });

    it('should handle DELETE API errors', async () => {
      const mockComponent: ComponentOutput = createComponentFixture({
        id: '1',
        queue: createQueueRef({ id: 'queue-1' }),
      });
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockComponent);
      vi.spyOn(operation as any, 'deleteRequest').mockRejectedValue(new Error('Deletion failed'));

      await expect(operation.execute('1')).rejects.toThrow('Deletion failed');
    });

    it('should log info messages', async () => {
      const mockComponent: ComponentOutput = createComponentFixture({
        id: '1',
        queue: createQueueRef({ id: 'queue-1' }),
      });
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockComponent);
      vi.spyOn(operation as any, 'deleteRequest').mockResolvedValue(undefined);

      await operation.execute('1');

      expect(mockLogger.info).toHaveBeenCalledWith('Удаление компонента 1');
      expect(mockLogger.info).toHaveBeenCalledWith('Компонент 1 успешно удалён');
    });

    it('should log debug messages about cache invalidation', async () => {
      const mockComponent: ComponentOutput = createComponentFixture({
        id: '1',
        queue: createQueueRef({ id: 'queue-1' }),
      });
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockComponent);
      vi.spyOn(operation as any, 'deleteRequest').mockResolvedValue(undefined);

      await operation.execute('1');

      expect(mockLogger.debug).toHaveBeenCalledWith('Инвалидирован кеш компонента: 1');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Инвалидирован кеш компонентов для очереди: queue-1'
      );
    });

    it('should work with numeric component ID', async () => {
      const mockComponent: ComponentOutput = createComponentFixture({
        id: '123',
        queue: createQueueRef({ id: 'queue-1' }),
      });
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockComponent);
      const deleteSpy = vi.spyOn(operation as any, 'deleteRequest').mockResolvedValue(undefined);

      await operation.execute('123');

      expect(mockHttpClient.get).toHaveBeenCalledWith('/v2/components/123');
      expect(deleteSpy).toHaveBeenCalledWith('/v2/components/123');
    });
  });
});
