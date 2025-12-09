/**
 * Unit tests for DeleteTaskOperation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteTaskOperation } from '#ticktick_api/api_operations/tasks/delete-task.operation.js';
import { createMockHttpClient, createMockCacheManager, createMockLogger } from '#helpers/index.js';
import type { IHttpClient } from '@mcp-framework/infrastructure';

describe('DeleteTaskOperation', () => {
  let operation: DeleteTaskOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockCache: ReturnType<typeof createMockCacheManager>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    mockCache = createMockCacheManager();
    operation = new DeleteTaskOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('should delete task', async () => {
    vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

    await operation.execute('proj-1', 'task-1');

    expect(mockHttpClient.delete).toHaveBeenCalledWith('/project/proj-1/task/task-1');
  });

  it('should log task deletion', async () => {
    vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

    await operation.execute('proj-1', 'task-1');

    expect(mockLogger.info).toHaveBeenCalledWith('Deleting task: proj-1/task-1');
    expect(mockLogger.info).toHaveBeenCalledWith('Task deleted: task-1');
  });

  it('should invalidate both task and project caches', async () => {
    vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

    await operation.execute('proj-1', 'task-1');

    expect(mockCache.delete).toHaveBeenCalledWith('task:proj-1:task-1');
    expect(mockCache.delete).toHaveBeenCalledWith('project:proj-1:data');
    expect(mockCache.delete).toHaveBeenCalledTimes(2);
  });

  it('should propagate HTTP client errors', async () => {
    const error = new Error('Delete failed');
    vi.mocked(mockHttpClient.delete).mockRejectedValue(error);

    await expect(operation.execute('proj-1', 'task-1')).rejects.toThrow('Delete failed');
  });
});
