/**
 * Unit tests for UpdateTaskOperation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateTaskOperation } from '#ticktick_api/api_operations/tasks/update-task.operation.js';
import { createMockHttpClient, createMockCacheManager, createMockLogger } from '#helpers/index.js';
import type { IHttpClient } from '@mcp-framework/infrastructure';
import type { TaskWithUnknownFields } from '#ticktick_api/entities/task.entity.js';
import type { UpdateTaskDto } from '#ticktick_api/dto/task.dto.js';

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

describe('UpdateTaskOperation', () => {
  let operation: UpdateTaskOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockCache: ReturnType<typeof createMockCacheManager>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    mockCache = createMockCacheManager();
    operation = new UpdateTaskOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('should update task', async () => {
    const dto: UpdateTaskDto = { title: 'Updated Title' };
    const expectedTask = createTaskFixture({ title: 'Updated Title' });
    vi.mocked(mockHttpClient.post).mockResolvedValue(expectedTask);

    const result = await operation.execute('proj-1', 'task-1', dto);

    expect(mockHttpClient.post).toHaveBeenCalledWith('/project/proj-1/task/task-1', dto);
    expect(result).toEqual(expectedTask);
  });

  it('should log task update', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createTaskFixture());

    await operation.execute('proj-1', 'task-1', { title: 'Test' });

    expect(mockLogger.info).toHaveBeenCalledWith('Updating task: proj-1/task-1');
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Task updated:'));
  });

  it('should invalidate both task and project caches', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createTaskFixture());

    await operation.execute('proj-1', 'task-1', { title: 'Test' });

    expect(mockCache.delete).toHaveBeenCalledWith('task:proj-1:task-1');
    expect(mockCache.delete).toHaveBeenCalledWith('project:proj-1:data');
    expect(mockCache.delete).toHaveBeenCalledTimes(2);
  });

  it('should propagate HTTP client errors', async () => {
    const error = new Error('Update failed');
    vi.mocked(mockHttpClient.post).mockRejectedValue(error);

    await expect(operation.execute('proj-1', 'task-1', {})).rejects.toThrow('Update failed');
  });
});
