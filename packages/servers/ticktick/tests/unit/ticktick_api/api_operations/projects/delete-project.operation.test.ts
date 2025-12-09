/**
 * Unit tests for DeleteProjectOperation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteProjectOperation } from '#ticktick_api/api_operations/projects/delete-project.operation.js';
import { createMockHttpClient, createMockCacheManager, createMockLogger } from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';

describe('DeleteProjectOperation', () => {
  let operation: DeleteProjectOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockCache: ReturnType<typeof createMockCacheManager>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    mockCache = createMockCacheManager();
    operation = new DeleteProjectOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('should delete project', async () => {
    vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

    await operation.execute('proj-1');

    expect(mockHttpClient.delete).toHaveBeenCalledWith('/project/proj-1');
  });

  it('should log project deletion', async () => {
    vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

    await operation.execute('proj-1');

    expect(mockLogger.info).toHaveBeenCalledWith('Deleting project: proj-1');
    expect(mockLogger.info).toHaveBeenCalledWith('Deleted project: proj-1');
  });

  it('should invalidate all related caches', async () => {
    vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

    await operation.execute('proj-1');

    expect(mockCache.delete).toHaveBeenCalledWith('project:proj-1');
    expect(mockCache.delete).toHaveBeenCalledWith('project:proj-1:data');
    expect(mockCache.delete).toHaveBeenCalledWith('projects:all');
    expect(mockCache.delete).toHaveBeenCalledTimes(3);
  });

  it('should propagate HTTP client errors', async () => {
    const error = new Error('Delete failed');
    vi.mocked(mockHttpClient.delete).mockRejectedValue(error);

    await expect(operation.execute('proj-1')).rejects.toThrow('Delete failed');
  });
});
