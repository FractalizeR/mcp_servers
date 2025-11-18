import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '@mcp-framework/infrastructure/http/client/http-client.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import { DeleteProjectOperation } from '@tracker_api/api_operations/project/delete-project.operation.js';
import { EntityCacheKey, EntityType } from '@mcp-framework/infrastructure';

describe('DeleteProjectOperation', () => {
  let operation: DeleteProjectOperation;
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
      get: vi.fn().mockReturnValue(undefined),
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

    operation = new DeleteProjectOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should call httpClient.delete with correct endpoint', async () => {
      vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

      await operation.execute({ projectId: 'project123' });

      expect(mockHttpClient.delete).toHaveBeenCalledWith('/v2/projects/project123');
    });

    it('should invalidate project cache after deletion', async () => {
      vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

      await operation.execute({ projectId: 'project123' });

      const cacheKey = EntityCacheKey.createKey(EntityType.PROJECT, 'project123');
      expect(mockCacheManager.delete).toHaveBeenCalledWith(cacheKey);
    });

    it('should invalidate list cache after deletion', async () => {
      vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

      await operation.execute({ projectId: 'project123' });

      const listCacheKey = EntityCacheKey.createKey(EntityType.PROJECT, 'list');
      expect(mockCacheManager.delete).toHaveBeenCalledWith(listCacheKey);
    });

    it('should log correct messages', async () => {
      vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

      await operation.execute({ projectId: 'TEST' });

      expect(mockLogger.info).toHaveBeenCalledWith('Удаление проекта: TEST');
      expect(mockLogger.info).toHaveBeenCalledWith('Проект удален: TEST');
    });
  });
});
