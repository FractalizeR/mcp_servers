import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '@mcp-framework/infrastructure/http/client/http-client.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import { DeleteChecklistItemOperation } from '@tracker_api/api_operations/checklist/delete-checklist-item.operation.js';

describe('DeleteChecklistItemOperation', () => {
  let operation: DeleteChecklistItemOperation;
  let mockHttpClient: HttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;

  // Mock для deleteRequest через прототип
  let deleteRequestSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as unknown as HttpClient;

    mockCacheManager = {
      get: vi.fn(),
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

    operation = new DeleteChecklistItemOperation(mockHttpClient, mockCacheManager, mockLogger);

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
      expect(mockLogger.error).toHaveBeenCalled();
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
});
