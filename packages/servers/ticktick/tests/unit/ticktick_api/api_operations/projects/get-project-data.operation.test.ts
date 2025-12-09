/**
 * Unit tests for GetProjectDataOperation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GetProjectDataOperation,
  type ProjectData,
} from '#ticktick_api/api_operations/projects/get-project-data.operation.js';
import { createMockHttpClient, createMockCacheManager, createMockLogger } from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';
import type { ProjectWithUnknownFields } from '#ticktick_api/entities/project.entity.js';
import type { TaskWithUnknownFields } from '#ticktick_api/entities/task.entity.js';

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

/**
 * Create test task fixture
 */
function createTaskFixture(overrides?: Partial<TaskWithUnknownFields>): TaskWithUnknownFields {
  return {
    id: 'task-123',
    projectId: 'proj-123',
    title: 'Test Task',
    priority: 0,
    status: 0,
    ...overrides,
  } as TaskWithUnknownFields;
}

describe('GetProjectDataOperation', () => {
  let operation: GetProjectDataOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockCache: ReturnType<typeof createMockCacheManager>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    mockCache = createMockCacheManager();
    operation = new GetProjectDataOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('should get project data with tasks', async () => {
    const expectedData: ProjectData = {
      project: createProjectFixture({ id: 'proj-1' }),
      tasks: [createTaskFixture({ id: 'task-1' }), createTaskFixture({ id: 'task-2' })],
    };
    vi.mocked(mockHttpClient.get).mockResolvedValue(expectedData);

    const result = await operation.execute('proj-1');

    expect(mockHttpClient.get).toHaveBeenCalledWith('/project/proj-1/data');
    expect(result).toEqual(expectedData);
  });

  it('should log project data fetch', async () => {
    const projectData: ProjectData = {
      project: createProjectFixture({ name: 'My Project' }),
      tasks: [createTaskFixture(), createTaskFixture()],
    };
    vi.mocked(mockHttpClient.get).mockResolvedValue(projectData);

    await operation.execute('proj-1');

    expect(mockLogger.info).toHaveBeenCalledWith('Fetching project data: proj-1');
    expect(mockLogger.info).toHaveBeenCalledWith('Fetched project "My Project" with 2 tasks');
  });

  it('should use cache', async () => {
    const projectData: ProjectData = {
      project: createProjectFixture(),
      tasks: [createTaskFixture()],
    };

    // First call - cache miss
    vi.mocked(mockCache.get).mockResolvedValueOnce(null);
    vi.mocked(mockHttpClient.get).mockResolvedValue(projectData);

    const result = await operation.execute('proj-1');

    expect(mockCache.get).toHaveBeenCalledWith('project:proj-1:data');
    expect(mockCache.set).toHaveBeenCalled();
    expect(result).toEqual(projectData);
  });

  it('should handle project with no tasks', async () => {
    const projectData: ProjectData = {
      project: createProjectFixture(),
      tasks: [],
    };
    vi.mocked(mockHttpClient.get).mockResolvedValue(projectData);

    const result = await operation.execute('proj-1');

    expect(result.tasks).toEqual([]);
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('with 0 tasks'));
  });

  it('should propagate HTTP client errors', async () => {
    const error = new Error('Project not found');
    vi.mocked(mockHttpClient.get).mockRejectedValue(error);

    await expect(operation.execute('proj-1')).rejects.toThrow('Project not found');
  });
});
