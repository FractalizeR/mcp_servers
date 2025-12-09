import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import { DeleteProjectOperation } from '#tracker_api/api_operations/project/delete-project.operation.js';
import { EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';

describe('DeleteProjectOperation', () => {
  let operation: DeleteProjectOperation;
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
