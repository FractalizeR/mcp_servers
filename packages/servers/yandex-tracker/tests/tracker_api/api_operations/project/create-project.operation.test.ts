import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '@mcp-framework/infrastructure/http/client/http-client.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { ProjectWithUnknownFields } from '@tracker_api/entities/index.js';
import { CreateProjectOperation } from '@tracker_api/api_operations/project/create-project.operation.js';
import { createProjectFixture } from '../../../helpers/project.fixture.js';
import { createCreateProjectDto } from '../../../helpers/project-dto.fixture.js';
import { EntityCacheKey, EntityType } from '@mcp-framework/infrastructure';

describe('CreateProjectOperation', () => {
  let operation: CreateProjectOperation;
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

    operation = new CreateProjectOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should call httpClient.post with correct endpoint and data', async () => {
      const inputDto = createCreateProjectDto({ key: 'NEWPROJ', name: 'New Project' });
      const mockProject: ProjectWithUnknownFields = createProjectFixture({
        key: 'NEWPROJ',
        name: 'New Project',
      });
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockProject);

      const result = await operation.execute(inputDto);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v2/projects', inputDto);
      expect(result).toEqual(mockProject);
    });

    it('should invalidate list cache after creation', async () => {
      const inputDto = createCreateProjectDto();
      const mockProject: ProjectWithUnknownFields = createProjectFixture();
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockProject);

      await operation.execute(inputDto);

      const listCacheKey = EntityCacheKey.createKey(EntityType.PROJECT, 'list');
      expect(mockCacheManager.delete).toHaveBeenCalledWith(listCacheKey);
    });

    it('should cache created project', async () => {
      const inputDto = createCreateProjectDto();
      const mockProject: ProjectWithUnknownFields = createProjectFixture({ id: 'project123' });
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockProject);

      await operation.execute(inputDto);

      const cacheKey = EntityCacheKey.createKey(EntityType.PROJECT, 'project123');
      expect(mockCacheManager.set).toHaveBeenCalledWith(cacheKey, mockProject);
    });

    it('should log correct messages', async () => {
      const inputDto = createCreateProjectDto({ key: 'TEST' });
      const mockProject: ProjectWithUnknownFields = createProjectFixture({
        key: 'TEST',
        id: 'project123',
      });
      vi.mocked(mockHttpClient.post).mockResolvedValue(mockProject);

      await operation.execute(inputDto);

      expect(mockLogger.info).toHaveBeenCalledWith('Создание проекта: TEST');
      expect(mockLogger.info).toHaveBeenCalledWith('Проект создан: TEST (ID: project123)');
    });
  });
});
