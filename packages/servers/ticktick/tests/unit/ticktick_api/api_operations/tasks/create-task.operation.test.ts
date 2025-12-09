/**
 * Unit tests for CreateTaskOperation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateTaskOperation } from '#ticktick_api/api_operations/tasks/create-task.operation.js';
import { createMockHttpClient, createMockCacheManager, createMockLogger } from '#helpers/index.js';
import type { IHttpClient } from '@mcp-framework/infrastructure';
import type { TaskWithUnknownFields } from '#ticktick_api/entities/task.entity.js';
import type { CreateTaskDto } from '#ticktick_api/dto/task.dto.js';

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

describe('CreateTaskOperation', () => {
  let operation: CreateTaskOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockCache: ReturnType<typeof createMockCacheManager>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    mockCache = createMockCacheManager();
    operation = new CreateTaskOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('should create task', async () => {
    const dto: CreateTaskDto = {
      title: 'New Task',
      projectId: 'project-1',
    };
    const expectedTask = createTaskFixture({
      id: 'new-task-id',
      title: 'New Task',
      projectId: 'project-1',
    });
    vi.mocked(mockHttpClient.post).mockResolvedValue(expectedTask);

    const result = await operation.execute(dto);

    expect(mockHttpClient.post).toHaveBeenCalledWith('/task', dto);
    expect(result).toEqual(expectedTask);
  });

  it('should log task creation', async () => {
    const dto: CreateTaskDto = { title: 'Test' };
    vi.mocked(mockHttpClient.post).mockResolvedValue(createTaskFixture());

    await operation.execute(dto);

    expect(mockLogger.info).toHaveBeenCalledWith('Creating task: Test');
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Task created:'));
  });

  it('should invalidate project cache after creation', async () => {
    const dto: CreateTaskDto = { title: 'Test', projectId: 'proj-123' };
    const task = createTaskFixture({ projectId: 'proj-123' });
    vi.mocked(mockHttpClient.post).mockResolvedValue(task);

    await operation.execute(dto);

    expect(mockCache.delete).toHaveBeenCalledWith('project:proj-123:data');
  });

  it('should not invalidate cache if task has no projectId', async () => {
    const dto: CreateTaskDto = { title: 'Inbox Task' };
    const task = createTaskFixture({ projectId: undefined });
    vi.mocked(mockHttpClient.post).mockResolvedValue(task);

    await operation.execute(dto);

    expect(mockCache.delete).not.toHaveBeenCalled();
  });

  it('should propagate HTTP client errors', async () => {
    const error = new Error('Network error');
    vi.mocked(mockHttpClient.post).mockRejectedValue(error);

    await expect(operation.execute({ title: 'Test' })).rejects.toThrow('Network error');
  });
});
