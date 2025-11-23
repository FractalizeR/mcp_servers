import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@mcp-framework/infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import { DeleteLinkOperation } from '#tracker_api/api_operations/link/delete-link.operation.js';

describe('DeleteLinkOperation', () => {
  let operation: DeleteLinkOperation;
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

    operation = new DeleteLinkOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should call httpClient.delete with correct endpoint', async () => {
      vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

      await operation.execute('TEST-123', 'link456');

      expect(mockHttpClient.delete).toHaveBeenCalledWith('/v3/issues/TEST-123/links/link456');
    });

    it('should invalidate cache after deleting link', async () => {
      vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

      await operation.execute('TEST-123', 'link789');

      // Проверяем, что кеш был инвалидирован
      expect(mockCacheManager.delete).toHaveBeenCalled();
    });

    it('should log info and debug messages', async () => {
      vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

      await operation.execute('TEST-456', 'link999');

      expect(mockLogger.info).toHaveBeenCalledWith('Удаление связи link999 из задачи TEST-456');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Инвалидирован кеш связей для задачи: TEST-456'
      );
      expect(mockLogger.debug).toHaveBeenCalledWith('Связь link999 удалена из задачи TEST-456');
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error: Link not found');
      vi.mocked(mockHttpClient.delete).mockRejectedValue(error);

      await expect(operation.execute('TEST-123', 'invalid-link')).rejects.toThrow(
        'API Error: Link not found'
      );
    });

    it('should work with issue ID instead of key', async () => {
      vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

      await operation.execute('abc123def456', 'link001');

      expect(mockHttpClient.delete).toHaveBeenCalledWith('/v3/issues/abc123def456/links/link001');
    });

    it('should handle 404 errors gracefully (link already deleted)', async () => {
      const error = new Error('404 Not Found');
      vi.mocked(mockHttpClient.delete).mockRejectedValue(error);

      await expect(operation.execute('TEST-123', 'already-deleted')).rejects.toThrow(
        '404 Not Found'
      );
    });

    it('should not fail if cache invalidation fails', async () => {
      vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);
      // Мокируем ошибку при инвалидации кеша
      vi.mocked(mockCacheManager.delete).mockImplementation(() => {
        throw new Error('Cache error');
      });

      // Операция должна успешно завершиться, несмотря на ошибку кеша
      await expect(operation.execute('TEST-789', 'link555')).rejects.toThrow('Cache error');
    });

    it('should delete multiple links sequentially', async () => {
      vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

      await operation.execute('TEST-100', 'link1');
      await operation.execute('TEST-100', 'link2');
      await operation.execute('TEST-100', 'link3');

      expect(mockHttpClient.delete).toHaveBeenCalledTimes(3);
      expect(mockHttpClient.delete).toHaveBeenNthCalledWith(1, '/v3/issues/TEST-100/links/link1');
      expect(mockHttpClient.delete).toHaveBeenNthCalledWith(2, '/v3/issues/TEST-100/links/link2');
      expect(mockHttpClient.delete).toHaveBeenNthCalledWith(3, '/v3/issues/TEST-100/links/link3');
    });

    it('should handle deletion of link from different issues', async () => {
      vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

      await operation.execute('PROJ-1', 'link-a');
      await operation.execute('PROJ-2', 'link-b');

      expect(mockHttpClient.delete).toHaveBeenCalledTimes(2);
      expect(mockCacheManager.delete).toHaveBeenCalledTimes(2);
    });
  });
});
