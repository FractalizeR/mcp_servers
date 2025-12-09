/**
 * Unit tests for UpdateProjectOperation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateProjectOperation } from '#ticktick_api/api_operations/projects/update-project.operation.js';
import { createMockHttpClient, createMockCacheManager, createMockLogger } from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';
import type { ProjectWithUnknownFields } from '#ticktick_api/entities/project.entity.js';
import type { UpdateProjectDto } from '#ticktick_api/dto/project.dto.js';

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

describe('UpdateProjectOperation', () => {
  let operation: UpdateProjectOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockCache: ReturnType<typeof createMockCacheManager>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    mockCache = createMockCacheManager();
    operation = new UpdateProjectOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('should update project', async () => {
    const dto: UpdateProjectDto = { name: 'Updated Name' };
    const expectedProject = createProjectFixture({ name: 'Updated Name' });
    vi.mocked(mockHttpClient.post).mockResolvedValue(expectedProject);

    const result = await operation.execute('proj-1', dto);

    expect(mockHttpClient.post).toHaveBeenCalledWith('/project/proj-1', dto);
    expect(result).toEqual(expectedProject);
  });

  it('should log project update', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createProjectFixture());

    await operation.execute('proj-1', { name: 'Test' });

    expect(mockLogger.info).toHaveBeenCalledWith('Updating project: proj-1');
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Updated project:'));
  });

  it('should invalidate all related caches', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createProjectFixture());

    await operation.execute('proj-1', { name: 'Test' });

    expect(mockCache.delete).toHaveBeenCalledWith('project:proj-1');
    expect(mockCache.delete).toHaveBeenCalledWith('project:proj-1:data');
    expect(mockCache.delete).toHaveBeenCalledWith('projects:all');
    expect(mockCache.delete).toHaveBeenCalledTimes(3);
  });

  it('should propagate HTTP client errors', async () => {
    const error = new Error('Update failed');
    vi.mocked(mockHttpClient.post).mockRejectedValue(error);

    await expect(operation.execute('proj-1', {})).rejects.toThrow('Update failed');
  });
});
