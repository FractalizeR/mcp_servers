/**
 * Unit tests for GetProjectsOperation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetProjectsOperation } from '#ticktick_api/api_operations/projects/get-projects.operation.js';
import { createMockHttpClient, createMockCacheManager, createMockLogger } from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';
import type { ProjectWithUnknownFields } from '#ticktick_api/entities/project.entity.js';

/**
 * Create test project fixture
 */
function createProjectFixture(
  overrides?: Partial<ProjectWithUnknownFields>
): ProjectWithUnknownFields {
  return {
    id: 'proj-123',
    name: 'Test Project',
    color: '#FF0000',
    ...overrides,
  } as ProjectWithUnknownFields;
}

describe('GetProjectsOperation', () => {
  let operation: GetProjectsOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockCache: ReturnType<typeof createMockCacheManager>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    mockCache = createMockCacheManager();
    operation = new GetProjectsOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('should get all projects', async () => {
    const expectedProjects = [
      createProjectFixture({ id: 'proj-1', name: 'Project 1' }),
      createProjectFixture({ id: 'proj-2', name: 'Project 2' }),
    ];
    vi.mocked(mockHttpClient.get).mockResolvedValue(expectedProjects);

    const result = await operation.execute();

    expect(mockHttpClient.get).toHaveBeenCalledWith('/project');
    expect(result).toEqual(expectedProjects);
  });

  it('should log projects fetch', async () => {
    const projects = [createProjectFixture(), createProjectFixture()];
    vi.mocked(mockHttpClient.get).mockResolvedValue(projects);

    await operation.execute();

    expect(mockLogger.info).toHaveBeenCalledWith('Fetching all projects');
    expect(mockLogger.info).toHaveBeenCalledWith('Fetched 2 projects');
  });

  it('should use cache', async () => {
    const projects = [createProjectFixture()];

    // First call - cache miss
    vi.mocked(mockCache.get).mockResolvedValueOnce(null);
    vi.mocked(mockHttpClient.get).mockResolvedValue(projects);

    const result = await operation.execute();

    expect(mockCache.get).toHaveBeenCalledWith('projects:all');
    expect(mockCache.set).toHaveBeenCalled();
    expect(result).toEqual(projects);
  });

  it('should handle empty projects list', async () => {
    vi.mocked(mockHttpClient.get).mockResolvedValue([]);

    const result = await operation.execute();

    expect(result).toEqual([]);
    expect(mockLogger.info).toHaveBeenCalledWith('Fetched 0 projects');
  });

  it('should propagate HTTP client errors', async () => {
    const error = new Error('Network error');
    vi.mocked(mockHttpClient.get).mockRejectedValue(error);

    await expect(operation.execute()).rejects.toThrow('Network error');
  });
});
