import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { ComponentOutput } from '#tracker_api/dto/index.js';
import { UpdateComponentOperation } from '#tracker_api/api_operations/component/update-component.operation.js';
import { createComponentFixture, createQueueRef } from '#helpers/component.fixture.js';
import { createUpdateComponentDto } from '#helpers/component-dto.fixture.js';
import { EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';

describe('UpdateComponentOperation', () => {
  let operation: UpdateComponentOperation;
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

    operation = new UpdateComponentOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should call httpClient.patch with correct endpoint and data', async () => {
      const updates = createUpdateComponentDto({ name: 'Updated Name' });
      const mockComponent: ComponentOutput = createComponentFixture({
        id: '1',
        name: 'Updated Name',
        queue: createQueueRef({ id: 'queue-1' }),
      });
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockComponent);

      const result = await operation.execute('1', updates);

      expect(mockHttpClient.patch).toHaveBeenCalledWith('/v2/components/1', updates);
      expect(result).toEqual(mockComponent);
    });

    it('should update component name', async () => {
      const updates = createUpdateComponentDto({ name: 'New Component Name' });
      const mockComponent: ComponentOutput = createComponentFixture({
        id: '1',
        name: 'New Component Name',
        queue: createQueueRef({ id: 'queue-1' }),
      });
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockComponent);

      const result = await operation.execute('1', updates);

      expect(result.name).toBe('New Component Name');
    });

    it('should update component description', async () => {
      const updates = createUpdateComponentDto({ description: 'New description' });
      const mockComponent: ComponentOutput = createComponentFixture({
        id: '1',
        description: 'New description',
        queue: createQueueRef({ id: 'queue-1' }),
      });
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockComponent);

      const result = await operation.execute('1', updates);

      expect(result.description).toBe('New description');
    });

    it('should update component lead', async () => {
      const updates = createUpdateComponentDto({ lead: 'new-user-login' });
      const mockComponent: ComponentOutput = createComponentFixture({
        id: '1',
        queue: createQueueRef({ id: 'queue-1' }),
      });
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockComponent);

      await operation.execute('1', updates);

      expect(mockHttpClient.patch).toHaveBeenCalledWith('/v2/components/1', updates);
    });

    it('should update assignAuto flag', async () => {
      const updates = createUpdateComponentDto({ assignAuto: true });
      const mockComponent: ComponentOutput = createComponentFixture({
        id: '1',
        assignAuto: true,
        queue: createQueueRef({ id: 'queue-1' }),
      });
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockComponent);

      const result = await operation.execute('1', updates);

      expect(result.assignAuto).toBe(true);
    });

    it('should update multiple fields at once', async () => {
      const updates = createUpdateComponentDto({
        name: 'Updated Name',
        description: 'Updated Description',
        assignAuto: false,
      });
      const mockComponent: ComponentOutput = createComponentFixture({
        id: '1',
        name: 'Updated Name',
        description: 'Updated Description',
        assignAuto: false,
        queue: createQueueRef({ id: 'queue-1' }),
      });
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockComponent);

      const result = await operation.execute('1', updates);

      expect(result).toMatchObject({
        name: 'Updated Name',
        description: 'Updated Description',
        assignAuto: false,
      });
    });

    it('should invalidate component cache after update', async () => {
      const updates = createUpdateComponentDto({ name: 'Updated' });
      const mockComponent: ComponentOutput = createComponentFixture({
        id: '1',
        queue: createQueueRef({ id: 'queue-1' }),
      });
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockComponent);

      await operation.execute('1', updates);

      const componentCacheKey = EntityCacheKey.createKey(EntityType.COMPONENT, '1');
      expect(mockCacheManager.delete).toHaveBeenCalledWith(componentCacheKey);
    });

    it('should invalidate components list cache after update', async () => {
      const updates = createUpdateComponentDto({ name: 'Updated' });
      const mockComponent: ComponentOutput = createComponentFixture({
        id: '1',
        queue: createQueueRef({ id: 'queue-123' }),
      });
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockComponent);

      await operation.execute('1', updates);

      const listCacheKey = EntityCacheKey.createKey(EntityType.QUEUE, 'queue-123/components');
      expect(mockCacheManager.delete).toHaveBeenCalledWith(listCacheKey);
    });

    it('should handle API errors', async () => {
      const updates = createUpdateComponentDto({ name: 'Updated' });
      const error = new Error('Component not found');
      vi.mocked(mockHttpClient.patch).mockRejectedValue(error);

      await expect(operation.execute('999', updates)).rejects.toThrow('Component not found');
    });

    it('should log info messages', async () => {
      const updates = createUpdateComponentDto({ name: 'Updated Component' });
      const mockComponent: ComponentOutput = createComponentFixture({
        id: '1',
        name: 'Updated Component',
        queue: createQueueRef({ id: 'queue-1' }),
      });
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockComponent);

      await operation.execute('1', updates);

      expect(mockLogger.info).toHaveBeenCalledWith('Обновление компонента 1');
      expect(mockLogger.info).toHaveBeenCalledWith('Компонент 1 успешно обновлён');
    });

    it('should log debug messages about cache invalidation', async () => {
      const updates = createUpdateComponentDto({ name: 'Test' });
      const mockComponent: ComponentOutput = createComponentFixture({
        id: '1',
        queue: createQueueRef({ id: 'queue-1' }),
      });
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockComponent);

      await operation.execute('1', updates);

      expect(mockLogger.debug).toHaveBeenCalledWith('Инвалидирован кеш компонента: 1');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Инвалидирован кеш компонентов для очереди: queue-1'
      );
    });

    it('should handle empty updates object', async () => {
      const updates = {};
      const mockComponent: ComponentOutput = createComponentFixture({
        id: '1',
        queue: createQueueRef({ id: 'queue-1' }),
      });
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockComponent);

      const result = await operation.execute('1', updates);

      expect(mockHttpClient.patch).toHaveBeenCalledWith('/v2/components/1', {});
      expect(result).toEqual(mockComponent);
    });
  });
});
