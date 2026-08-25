import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import { EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';
import { ManageSprintLifecycleOperation } from '#tracker_api/api_operations/sprint/manage-sprint-lifecycle.operation.js';

describe('ManageSprintLifecycleOperation', () => {
  let operation: ManageSprintLifecycleOperation;
  let mockHttpClient: IHttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
    } as unknown as IHttpClient;

    mockCacheManager = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      has: vi.fn(),
    } as unknown as CacheManager;

    mockLogger = {
      child: vi.fn().mockReturnThis(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    operation = new ManageSprintLifecycleOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  it('start: POST /v3/sprints/{id}/_start, возвращает спринт', async () => {
    const sprint = { id: 1, self: 'url', version: 2, name: 'Sprint 1', status: 'in_progress' };
    vi.mocked(mockHttpClient.post).mockResolvedValue(sprint);

    const result = await operation.execute({ sprintId: '1', action: 'start' });

    expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/sprints/1/_start');
    expect(result).toEqual(sprint);
  });

  it('archive: POST /v3/sprints/{id}/_archive, возвращает спринт', async () => {
    const sprint = { id: 1, self: 'url', version: 3, name: 'Sprint 1', archived: true };
    vi.mocked(mockHttpClient.post).mockResolvedValue(sprint);

    const result = await operation.execute({ sprintId: '1', action: 'archive' });

    expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/sprints/1/_archive');
    expect(result).toEqual(sprint);
  });

  it('delete: DELETE /v3/sprints/{id}, возвращает null (204 без тела)', async () => {
    const result = await operation.execute({ sprintId: '1', action: 'delete' });

    expect(mockHttpClient.delete).toHaveBeenCalledWith('/v3/sprints/1');
    expect(mockHttpClient.post).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('инвалидирует кеш спринта независимо от действия', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue({ id: 1 });
    await operation.execute({ sprintId: '1', action: 'start' });

    const cacheKey = EntityCacheKey.createKey(EntityType.SPRINT, '1');
    expect(mockCacheManager.delete).toHaveBeenCalledWith(cacheKey);
  });

  it('пробрасывает ошибку API', async () => {
    vi.mocked(mockHttpClient.post).mockRejectedValue(new Error('Sprint already archived'));

    await expect(operation.execute({ sprintId: '1', action: 'archive' })).rejects.toThrow(
      'Sprint already archived'
    );
  });
});
