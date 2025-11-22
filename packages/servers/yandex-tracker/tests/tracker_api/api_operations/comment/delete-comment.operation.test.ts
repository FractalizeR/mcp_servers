import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@mcp-framework/infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import { DeleteCommentOperation } from '#tracker_api/api_operations/comment/delete-comment.operation.js';

describe('DeleteCommentOperation', () => {
  let operation: DeleteCommentOperation;
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

    operation = new DeleteCommentOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should call deleteRequest with correct endpoint', async () => {
      // Mock deleteRequest через httpClient.delete (используется в BaseOperation.deleteRequest)
      vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

      await operation.execute('TEST-1', '123');

      expect(mockHttpClient.delete).toHaveBeenCalledWith('/v3/issues/TEST-1/comments/123');
    });

    it('should successfully delete comment', async () => {
      vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

      await expect(operation.execute('PROJ-10', '456')).resolves.toBeUndefined();
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error: Comment not found');
      vi.mocked(mockHttpClient.delete).mockRejectedValue(error);

      await expect(operation.execute('TEST-1', '123')).rejects.toThrow(
        'API Error: Comment not found'
      );
    });

    it('should log info messages', async () => {
      vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

      await operation.execute('TEST-2', '789');

      expect(mockLogger.info).toHaveBeenCalledWith('Удаление комментария 789 задачи TEST-2');
      expect(mockLogger.info).toHaveBeenCalledWith('Комментарий 789 задачи TEST-2 успешно удалён');
    });

    it('should handle deletion of non-existent comment', async () => {
      const error = new Error('404 Not Found');
      vi.mocked(mockHttpClient.delete).mockRejectedValue(error);

      await expect(operation.execute('TEST-3', '999')).rejects.toThrow('404 Not Found');
    });
  });
});
