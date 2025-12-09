/**
 * Unit tests for GetTasksOperation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetTasksOperation } from '#ticktick_api/api_operations/tasks/get-tasks.operation.js';
import type { TaskRef } from '#ticktick_api/api_operations/tasks/get-tasks.operation.js';
import { createMockHttpClient, createMockCacheManager, createMockLogger } from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';
import type { TaskWithUnknownFields } from '#ticktick_api/entities/task.entity.js';
import type { ServerConfig } from '#config';

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

/**
 * Create mock ServerConfig
 */
function createMockConfig(): ServerConfig {
  return {
    batch: {
      maxBatchSize: 100,
      maxConcurrentRequests: 5,
    },
  } as ServerConfig;
}

describe('GetTasksOperation', () => {
  let operation: GetTasksOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockCache: ReturnType<typeof createMockCacheManager>;
  let mockConfig: ServerConfig;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    mockCache = createMockCacheManager();
    mockConfig = createMockConfig();
    operation = new GetTasksOperation(mockHttpClient, mockCache, mockLogger, mockConfig);
  });

  it('should get multiple tasks in parallel', async () => {
    const taskRefs: TaskRef[] = [
      { projectId: 'proj-1', taskId: 'task-1' },
      { projectId: 'proj-1', taskId: 'task-2' },
    ];
    const task1 = createTaskFixture({ id: 'task-1' });
    const task2 = createTaskFixture({ id: 'task-2' });
    vi.mocked(mockHttpClient.get).mockResolvedValueOnce(task1).mockResolvedValueOnce(task2);

    const results = await operation.execute(taskRefs);

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('fulfilled');
    if (results[0].status === 'fulfilled' && results[1].status === 'fulfilled') {
      expect(results[0].value).toEqual(task1);
      expect(results[1].value).toEqual(task2);
    }
  });

  it('should handle empty array', async () => {
    const results = await operation.execute([]);

    expect(results).toEqual([]);
    expect(mockLogger.warn).toHaveBeenCalledWith('GetTasksOperation: empty refs array');
  });

  it('should log batch operation', async () => {
    const taskRefs: TaskRef[] = [
      { projectId: 'proj-1', taskId: 'task-1' },
      { projectId: 'proj-1', taskId: 'task-2' },
    ];
    vi.mocked(mockHttpClient.get).mockResolvedValue(createTaskFixture());

    await operation.execute(taskRefs);

    expect(mockLogger.info).toHaveBeenCalledWith('Getting 2 tasks in parallel');
  });

  it('should handle partial failures', async () => {
    const taskRefs: TaskRef[] = [
      { projectId: 'proj-1', taskId: 'task-1' },
      { projectId: 'proj-1', taskId: 'task-2' },
    ];
    const task1 = createTaskFixture({ id: 'task-1' });
    const error = new Error('Task not found');
    vi.mocked(mockHttpClient.get).mockResolvedValueOnce(task1).mockRejectedValueOnce(error);

    const results = await operation.execute(taskRefs);

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('rejected');
  });

  it('should use cache for requests', async () => {
    const taskRefs: TaskRef[] = [{ projectId: 'proj-1', taskId: 'task-1' }];
    const task = createTaskFixture({ id: 'task-1' });

    // First call - cache miss
    vi.mocked(mockCache.get).mockResolvedValueOnce(null);
    vi.mocked(mockHttpClient.get).mockResolvedValue(task);

    await operation.execute(taskRefs);

    expect(mockCache.get).toHaveBeenCalledWith('task:proj-1:task-1');
    expect(mockCache.set).toHaveBeenCalled();
  });
});
