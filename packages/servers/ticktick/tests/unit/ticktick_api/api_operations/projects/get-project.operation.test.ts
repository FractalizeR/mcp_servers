/**
 * Unit tests for GetProjectOperation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetProjectOperation } from '#ticktick_api/api_operations/projects/get-project.operation.js';
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

describe('GetProjectOperation', () => {
  let operation: GetProjectOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockCache: ReturnType<typeof createMockCacheManager>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    mockCache = createMockCacheManager();
    operation = new GetProjectOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('should get project by id', async () => {
    const expectedProject = createProjectFixture({ id: 'proj-1', name: 'My Project' });
    vi.mocked(mockHttpClient.get).mockResolvedValue(expectedProject);

    const result = await operation.execute('proj-1');

    expect(mockHttpClient.get).toHaveBeenCalledWith('/project/proj-1');
    expect(result).toEqual(expectedProject);
  });

  it('should log project fetch', async () => {
    vi.mocked(mockHttpClient.get).mockResolvedValue(createProjectFixture());

    await operation.execute('proj-1');

    expect(mockLogger.info).toHaveBeenCalledWith('Fetching project: proj-1');
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Fetched project:'));
  });

  it('should use cache', async () => {
    const project = createProjectFixture();

    // First call - cache miss
    vi.mocked(mockCache.get).mockResolvedValueOnce(null);
    vi.mocked(mockHttpClient.get).mockResolvedValue(project);

    const result = await operation.execute('proj-1');

    expect(mockCache.get).toHaveBeenCalledWith('project:proj-1');
    expect(mockCache.set).toHaveBeenCalled();
    expect(result).toEqual(project);
  });

  it('should propagate HTTP client errors', async () => {
    const error = new Error('Project not found');
    vi.mocked(mockHttpClient.get).mockRejectedValue(error);

    await expect(operation.execute('proj-1')).rejects.toThrow('Project not found');
  });
});
