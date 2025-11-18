import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '@mcp-framework/infrastructure/http/client/http-client.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { ProjectWithUnknownFields } from '@tracker_api/entities/index.js';
import { GetProjectOperation } from '@tracker_api/api_operations/project/get-project.operation.js';
import { createProjectFixture } from '../../../helpers/project.fixture.js';
import { EntityCacheKey, EntityType } from '@mcp-framework/infrastructure';

describe('GetProjectOperation', () => {
  let operation: GetProjectOperation;
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
      get: vi.fn().mockReturnValue(undefined), // По умолчанию кеш пустой (undefined, синхронно)
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

    operation = new GetProjectOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should call httpClient.get with correct endpoint', async () => {
      const mockProject: ProjectWithUnknownFields = createProjectFixture({ key: 'TESTPROJ' });
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockProject);

      const result = await operation.execute({ projectId: 'TESTPROJ' });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/v2/projects/TESTPROJ');
      expect(result).toEqual(mockProject);
    });

    it('should pass expand parameter', async () => {
      const mockProject: ProjectWithUnknownFields = createProjectFixture({ key: 'PROJ' });
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockProject);

      await operation.execute({ projectId: 'PROJ', expand: 'queues' });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/v2/projects/PROJ?expand=queues');
    });

    it('should cache project by its ID', async () => {
      const mockProject: ProjectWithUnknownFields = createProjectFixture({ id: 'project123' });
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockProject);

      await operation.execute({ projectId: 'project123' });

      const cacheKey = EntityCacheKey.createKey(EntityType.PROJECT, 'project123');
      expect(mockCacheManager.set).toHaveBeenCalledWith(cacheKey, mockProject);
    });

    it('should return cached project if available', async () => {
      const cachedProject: ProjectWithUnknownFields = createProjectFixture({ id: 'cached' });
      const cacheKey = EntityCacheKey.createKey(EntityType.PROJECT, 'cached');
      vi.mocked(mockCacheManager.get).mockReturnValue(cachedProject); // синхронный возврат

      const result = await operation.execute({ projectId: 'cached' });

      expect(result).toEqual(cachedProject);
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });

    it('should log correct messages', async () => {
      const mockProject: ProjectWithUnknownFields = createProjectFixture({ key: 'TEST' });
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockProject);

      await operation.execute({ projectId: 'TEST' });

      expect(mockLogger.info).toHaveBeenCalledWith('Получение проекта: TEST');
      expect(mockLogger.info).toHaveBeenCalledWith(`Проект получен: ${mockProject.key}`);
    });
  });
});
