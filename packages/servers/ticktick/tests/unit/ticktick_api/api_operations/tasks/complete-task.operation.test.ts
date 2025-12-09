/**
 * Unit tests for CompleteTaskOperation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompleteTaskOperation } from '#ticktick_api/api_operations/tasks/complete-task.operation.js';
import { createMockHttpClient, createMockCacheManager, createMockLogger } from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';

describe('CompleteTaskOperation', () => {
  let operation: CompleteTaskOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockCache: ReturnType<typeof createMockCacheManager>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    mockCache = createMockCacheManager();
    operation = new CompleteTaskOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('should complete task', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(undefined);

    await operation.execute('proj-1', 'task-1');

    expect(mockHttpClient.post).toHaveBeenCalledWith('/task/task-1/complete');
  });

  it('should log task completion', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(undefined);

    await operation.execute('proj-1', 'task-1');

    expect(mockLogger.info).toHaveBeenCalledWith('Completing task: task-1');
    expect(mockLogger.info).toHaveBeenCalledWith('Task completed: task-1');
  });

  it('should invalidate both task and project caches', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(undefined);

    await operation.execute('proj-1', 'task-1');

    expect(mockCache.delete).toHaveBeenCalledWith('task:proj-1:task-1');
    expect(mockCache.delete).toHaveBeenCalledWith('project:proj-1:data');
    expect(mockCache.delete).toHaveBeenCalledTimes(2);
  });

  it('should propagate HTTP client errors', async () => {
    const error = new Error('Complete failed');
    vi.mocked(mockHttpClient.post).mockRejectedValue(error);

    await expect(operation.execute('proj-1', 'task-1')).rejects.toThrow('Complete failed');
  });
});
