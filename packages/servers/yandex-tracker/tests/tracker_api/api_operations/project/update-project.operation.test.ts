import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '@mcp-framework/infrastructure/http/client/http-client.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { ProjectWithUnknownFields } from '@tracker_api/entities/index.js';
import { UpdateProjectOperation } from '@tracker_api/api_operations/project/update-project.operation.js';
import { createProjectFixture } from '../../../helpers/project.fixture.js';
import { createUpdateProjectDto } from '../../../helpers/project-dto.fixture.js';
import { EntityCacheKey, EntityType } from '@mcp-framework/infrastructure';

describe('UpdateProjectOperation', () => {
  let operation: UpdateProjectOperation;
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

    operation = new UpdateProjectOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should call httpClient.patch with correct endpoint and data', async () => {
      const updateDto = createUpdateProjectDto({ name: 'Updated Name' });
      const mockProject: ProjectWithUnknownFields = createProjectFixture({ name: 'Updated Name' });
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockProject);

      const result = await operation.execute({ projectId: 'project123', data: updateDto });

      expect(mockHttpClient.patch).toHaveBeenCalledWith('/v2/projects/project123', updateDto);
      expect(result).toEqual(mockProject);
    });

    it('should invalidate project cache after update', async () => {
      const updateDto = createUpdateProjectDto();
      const mockProject: ProjectWithUnknownFields = createProjectFixture({ id: 'project123' });
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockProject);

      await operation.execute({ projectId: 'project123', data: updateDto });

      const cacheKey = EntityCacheKey.createKey(EntityType.PROJECT, 'project123');
      expect(mockCacheManager.delete).toHaveBeenCalledWith(cacheKey);
    });

    it('should invalidate list cache after update', async () => {
      const updateDto = createUpdateProjectDto();
      const mockProject: ProjectWithUnknownFields = createProjectFixture();
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockProject);

      await operation.execute({ projectId: 'project123', data: updateDto });

      const listCacheKey = EntityCacheKey.createKey(EntityType.PROJECT, 'list');
      expect(mockCacheManager.delete).toHaveBeenCalledWith(listCacheKey);
    });

    it('should log correct messages', async () => {
      const updateDto = createUpdateProjectDto();
      const mockProject: ProjectWithUnknownFields = createProjectFixture({ key: 'TEST' });
      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockProject);

      await operation.execute({ projectId: 'TEST', data: updateDto });

      expect(mockLogger.info).toHaveBeenCalledWith('Обновление проекта: TEST');
      expect(mockLogger.info).toHaveBeenCalledWith('Проект обновлен: TEST');
    });
  });
});
