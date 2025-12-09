import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { ProjectWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetProjectsOperation } from '#tracker_api/api_operations/project/get-projects.operation.js';
import { createProjectListFixture } from '#helpers/project.fixture.js';

describe('GetProjectsOperation', () => {
  let operation: GetProjectsOperation;
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

    operation = new GetProjectsOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('execute', () => {
    it('should call httpClient.get with correct endpoint', async () => {
      const mockProjects: ProjectWithUnknownFields[] = createProjectListFixture(3);
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockProjects);

      const result = await operation.execute({});

      expect(mockHttpClient.get).toHaveBeenCalledWith('/v2/projects');
      expect(result.projects).toEqual(mockProjects);
      expect(result.total).toBe(3);
    });

    it('should pass pagination parameters', async () => {
      const mockProjects: ProjectWithUnknownFields[] = createProjectListFixture(2);
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockProjects);

      await operation.execute({ page: 2, perPage: 100 });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/v2/projects?page=2&perPage=100');
    });

    it('should pass expand parameter', async () => {
      const mockProjects: ProjectWithUnknownFields[] = createProjectListFixture(1);
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockProjects);

      await operation.execute({ expand: 'queues' });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/v2/projects?expand=queues');
    });

    it('should pass queueId filter', async () => {
      const mockProjects: ProjectWithUnknownFields[] = createProjectListFixture(1);
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockProjects);

      await operation.execute({ queueId: 'QUEUE1' });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/v2/projects?queueId=QUEUE1');
    });

    it('should log correct messages', async () => {
      const mockProjects: ProjectWithUnknownFields[] = createProjectListFixture(5);
      vi.mocked(mockHttpClient.get).mockResolvedValue(mockProjects);

      await operation.execute({});

      expect(mockLogger.info).toHaveBeenCalledWith('Получение списка проектов');
      expect(mockLogger.info).toHaveBeenCalledWith('Получено проектов: 5');
    });
  });
});
