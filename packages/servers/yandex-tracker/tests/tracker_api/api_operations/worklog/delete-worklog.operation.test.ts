import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@mcp-framework/infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import { DeleteWorklogOperation } from '#tracker_api/api_operations/worklog/delete-worklog.operation.js';

describe('DeleteWorklogOperation', () => {
  let operation: DeleteWorklogOperation;
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

    operation = new DeleteWorklogOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should call deleteRequest with correct endpoint', async () => {
      vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

      await operation.execute('TEST-1', '123');

      expect(mockHttpClient.delete).toHaveBeenCalledWith('/v2/issues/TEST-1/worklog/123');
    });

    it('should successfully delete worklog', async () => {
      vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

      await expect(operation.execute('PROJ-10', '456')).resolves.toBeUndefined();
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error: Worklog not found');
      vi.mocked(mockHttpClient.delete).mockRejectedValue(error);

      await expect(operation.execute('TEST-1', '123')).rejects.toThrow(
        'API Error: Worklog not found'
      );
    });

    it('should log info messages', async () => {
      vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

      await operation.execute('TEST-2', '789');

      expect(mockLogger.info).toHaveBeenCalledWith('Удаление записи времени 789 задачи TEST-2');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Запись времени 789 задачи TEST-2 успешно удалена'
      );
    });

    it('should handle deletion of non-existent worklog', async () => {
      const error = new Error('404 Not Found');
      vi.mocked(mockHttpClient.delete).mockRejectedValue(error);

      await expect(operation.execute('TEST-3', '999')).rejects.toThrow('404 Not Found');
    });

    it('should handle unauthorized deletion', async () => {
      const error = new Error('403 Forbidden');
      vi.mocked(mockHttpClient.delete).mockRejectedValue(error);

      await expect(operation.execute('TEST-4', '111')).rejects.toThrow('403 Forbidden');
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      vi.mocked(mockHttpClient.delete).mockRejectedValue(error);

      await expect(operation.execute('TEST-5', '222')).rejects.toThrow('Network error');
    });
  });
});
