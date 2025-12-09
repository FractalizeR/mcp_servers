import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { ServerConfig } from '#config';
import { DeleteChecklistItemOperation } from '#tracker_api/api_operations/checklist/delete-checklist-item.operation.js';

describe('DeleteChecklistItemOperation', () => {
  let operation: DeleteChecklistItemOperation;
  let mockHttpClient: IHttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;
  let mockConfig: ServerConfig;

  // Mock для deleteRequest через прототип
  let deleteRequestSpy: ReturnType<typeof vi.spyOn>;

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

    mockConfig = {
      maxBatchSize: 100,
      maxConcurrentRequests: 5,
    } as ServerConfig;

    operation = new DeleteChecklistItemOperation(
      mockHttpClient,
      mockCacheManager,
      mockLogger,
      mockConfig
    );

    // Мокаем protected метод deleteRequest
    deleteRequestSpy = vi
      .spyOn(DeleteChecklistItemOperation.prototype as never, 'deleteRequest')
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    deleteRequestSpy.mockRestore();
  });

  describe('execute', () => {
    it('should call deleteRequest with correct endpoint', async () => {
      await operation.execute('TEST-1', '123');

      expect(deleteRequestSpy).toHaveBeenCalledWith('/v2/issues/TEST-1/checklistItems/123');
    });

    it('should not return any value', async () => {
      const result = await operation.execute('PROJ-10', '456');

      expect(result).toBeUndefined();
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      deleteRequestSpy.mockRejectedValue(error);

      await expect(operation.execute('TEST-1', '123')).rejects.toThrow('API Error');
    });

    it('should log info messages', async () => {
      await operation.execute('TEST-2', '789');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Удаление элемента 789 из чеклиста задачи TEST-2'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Элемент 789 чеклиста задачи TEST-2 успешно удалён'
      );
    });

    it('should handle deletion of non-existent item', async () => {
      const error = new Error('Not Found');
      deleteRequestSpy.mockRejectedValue(error);

      await expect(operation.execute('TEST-5', 'nonexistent')).rejects.toThrow('Not Found');
    });
  });

  describe('executeMany', () => {
    it('should return empty array for empty input', async () => {
      const result = await operation.executeMany([]);

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'DeleteChecklistItemOperation: пустой массив элементов'
      );
    });

    it('should delete items from multiple issues in parallel', async () => {
      const result = await operation.executeMany([
        { issueId: 'TEST-1', itemId: 'item-1' },
        { issueId: 'TEST-2', itemId: 'item-2' },
      ]);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        status: 'fulfilled',
        key: 'TEST-1/item-1',
      });
      expect(result[1]).toMatchObject({
        status: 'fulfilled',
        key: 'TEST-2/item-2',
      });
    });

    it('should handle partial failures', async () => {
      deleteRequestSpy
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Item not found'));

      const result = await operation.executeMany([
        { issueId: 'TEST-1', itemId: 'item-1' },
        { issueId: 'NONEXISTENT-1', itemId: 'item-2' },
      ]);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        status: 'fulfilled',
        key: 'TEST-1/item-1',
      });
      expect(result[1]).toMatchObject({
        status: 'rejected',
        key: 'NONEXISTENT-1/item-2',
      });
    });

    it('should log batch operation start', async () => {
      await operation.executeMany([
        { issueId: 'TEST-1', itemId: 'item-1' },
        { issueId: 'TEST-2', itemId: 'item-2' },
      ]);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Удаление элементов из чеклистов 2 задач параллельно: TEST-1/item-1, TEST-2/item-2'
      );
    });

    it('should call deleteRequest for each item', async () => {
      await operation.executeMany([
        { issueId: 'TEST-1', itemId: 'item-1' },
        { issueId: 'TEST-2', itemId: 'item-2' },
      ]);

      expect(deleteRequestSpy).toHaveBeenCalledTimes(2);
      expect(deleteRequestSpy).toHaveBeenCalledWith('/v2/issues/TEST-1/checklistItems/item-1');
      expect(deleteRequestSpy).toHaveBeenCalledWith('/v2/issues/TEST-2/checklistItems/item-2');
    });
  });
});
