/**
 * Unit tests for CreateProjectOperation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateProjectOperation } from '#ticktick_api/api_operations/projects/create-project.operation.js';
import { createMockHttpClient, createMockCacheManager, createMockLogger } from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';
import type { ProjectWithUnknownFields } from '#ticktick_api/entities/project.entity.js';
import type { CreateProjectDto } from '#ticktick_api/dto/project.dto.js';

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

describe('CreateProjectOperation', () => {
  let operation: CreateProjectOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockCache: ReturnType<typeof createMockCacheManager>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    mockCache = createMockCacheManager();
    operation = new CreateProjectOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('should create project', async () => {
    const dto: CreateProjectDto = { name: 'New Project' };
    const expectedProject = createProjectFixture({ name: 'New Project' });
    vi.mocked(mockHttpClient.post).mockResolvedValue(expectedProject);

    const result = await operation.execute(dto);

    expect(mockHttpClient.post).toHaveBeenCalledWith('/project', dto);
    expect(result).toEqual(expectedProject);
  });

  it('should log project creation', async () => {
    const dto: CreateProjectDto = { name: 'Test Project' };
    vi.mocked(mockHttpClient.post).mockResolvedValue(createProjectFixture());

    await operation.execute(dto);

    expect(mockLogger.info).toHaveBeenCalledWith('Creating project: Test Project');
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Created project:'));
  });

  it('should invalidate projects list cache', async () => {
    const dto: CreateProjectDto = { name: 'Test' };
    vi.mocked(mockHttpClient.post).mockResolvedValue(createProjectFixture());

    await operation.execute(dto);

    expect(mockCache.delete).toHaveBeenCalledWith('projects:all');
  });

  it('should propagate HTTP client errors', async () => {
    const error = new Error('Create failed');
    vi.mocked(mockHttpClient.post).mockRejectedValue(error);

    await expect(operation.execute({ name: 'Test' })).rejects.toThrow('Create failed');
  });
});
