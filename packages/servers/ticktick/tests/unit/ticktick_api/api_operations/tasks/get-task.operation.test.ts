/**
 * Unit tests for GetTaskOperation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetTaskOperation } from '#ticktick_api/api_operations/tasks/get-task.operation.js';
import { createMockHttpClient, createMockCacheManager, createMockLogger } from '#helpers/index.js';
import type { IHttpClient } from '@mcp-framework/infrastructure';
import type { TaskWithUnknownFields } from '#ticktick_api/entities/task.entity.js';

/**
 * Create test task fixture
 */
function createTaskFixture(overrides?: Partial<TaskWithUnknownFields>): TaskWithUnknownFields {
  return {
    id: 'task-123',
    projectId: 'project-abc',
    title: 'Test Task',
    content: 'Task description',
    priority: 0,
    status: 0,
    ...overrides,
  } as TaskWithUnknownFields;
}

describe('GetTaskOperation', () => {
  let operation: GetTaskOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new GetTaskOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('should get task by projectId and taskId', async () => {
    const expectedTask = createTaskFixture({
      id: 'task-xyz',
      projectId: 'proj-123',
      title: 'My Task',
    });
    vi.mocked(mockHttpClient.get).mockResolvedValue(expectedTask);

    const result = await operation.execute('proj-123', 'task-xyz');

    expect(mockHttpClient.get).toHaveBeenCalledWith('/project/proj-123/task/task-xyz');
    expect(result).toEqual(expectedTask);
  });

  it('should log operation info', async () => {
    vi.mocked(mockHttpClient.get).mockResolvedValue(createTaskFixture());

    await operation.execute('project-1', 'task-1');

    expect(mockLogger.info).toHaveBeenCalledWith('Getting task: project-1/task-1');
  });

  it('should propagate HTTP client errors', async () => {
    const error = new Error('Network error');
    vi.mocked(mockHttpClient.get).mockRejectedValue(error);

    await expect(operation.execute('proj', 'task')).rejects.toThrow('Network error');
  });

  it('should use cache for repeated requests', async () => {
    const task = createTaskFixture({ title: 'Cached Task' });
    const mockCache = createMockCacheManager();

    // First call - cache miss
    vi.mocked(mockCache.get).mockResolvedValueOnce(null);
    vi.mocked(mockHttpClient.get).mockResolvedValue(task);

    const op = new GetTaskOperation(mockHttpClient, mockCache, mockLogger);
    const result1 = await op.execute('proj', 'task');

    expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
    expect(result1.title).toBe('Cached Task');

    // Verify cache.set was called
    expect(mockCache.set).toHaveBeenCalled();
  });
});
