import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import { EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';
import { ManageSprintLifecycleOperation } from '#tracker_api/api_operations/sprint/manage-sprint-lifecycle.operation.js';
import { createSprintFixture } from '#helpers/agile.fixture.js';

describe('ManageSprintLifecycleOperation', () => {
  let operation: ManageSprintLifecycleOperation;
  let mockHttpClient: IHttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn().mockResolvedValue(createSprintFixture({ id: 1, version: 7 })),
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

  it('start: без версии читает текущую и шлёт её в query', async () => {
    const sprint = createSprintFixture({ id: 1, version: 7, status: 'in_progress' });
    vi.mocked(mockHttpClient.post).mockResolvedValue(sprint);

    const result = await operation.execute({ sprintId: '1', action: 'start' });

    expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/sprints/1');
    expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/sprints/1/_start?version=7');
    expect(result).toEqual(sprint);
  });

  it('start: переданную версию берёт как есть и лишнего GET не делает', async () => {
    const sprint = createSprintFixture({ id: 1, version: 3, status: 'in_progress' });
    vi.mocked(mockHttpClient.post).mockResolvedValue(sprint);

    await operation.execute({ sprintId: '1', action: 'start', version: 3 });

    expect(mockHttpClient.get).not.toHaveBeenCalled();
    expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/sprints/1/_start?version=3');
  });

  it('start: ответ GET без числовой версии даёт понятный отказ, а не ?version=undefined', async () => {
    vi.mocked(mockHttpClient.get).mockResolvedValue({ id: 1 });

    await expect(operation.execute({ sprintId: '1', action: 'start' })).rejects.toThrow(
      /версию спринта/
    );
    expect(mockHttpClient.post).not.toHaveBeenCalled();
  });

  it('archive: POST /v3/sprints/{id}/_archive?version=…, возвращает спринт', async () => {
    const sprint = createSprintFixture({ id: 1, version: 8, archived: true });
    vi.mocked(mockHttpClient.post).mockResolvedValue(sprint);

    const result = await operation.execute({ sprintId: '1', action: 'archive', version: 8 });

    expect(mockHttpClient.get).not.toHaveBeenCalled();
    expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/sprints/1/_archive?version=8');
    expect(result).toEqual(sprint);
  });

  it('delete: DELETE /v3/sprints/{id} без версии в query, возвращает null (204 без тела)', async () => {
    const result = await operation.execute({ sprintId: '1', action: 'delete' });

    expect(mockHttpClient.get).not.toHaveBeenCalled();
    expect(mockHttpClient.delete).toHaveBeenCalledWith('/v3/sprints/1');
    expect(mockHttpClient.post).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('инвалидирует кеш спринта независимо от действия', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue({ id: 1 });
    await operation.execute({ sprintId: '1', action: 'start', version: 1 });

    const cacheKey = EntityCacheKey.createKey(EntityType.SPRINT, '1');
    expect(mockCacheManager.delete).toHaveBeenCalledWith(cacheKey);
  });

  it('ошибка POST после прочитанной версии не инвалидирует кеш спринта', async () => {
    vi.mocked(mockHttpClient.post).mockRejectedValue(new Error('Sprint already archived'));

    await expect(operation.execute({ sprintId: '1', action: 'archive' })).rejects.toThrow(
      'Sprint already archived'
    );

    expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/sprints/1');
    expect(mockCacheManager.delete).not.toHaveBeenCalled();
  });

  it('пробрасывает ошибку API', async () => {
    vi.mocked(mockHttpClient.post).mockRejectedValue(new Error('Sprint already archived'));

    await expect(
      operation.execute({ sprintId: '1', action: 'archive', version: 1 })
    ).rejects.toThrow('Sprint already archived');
  });
});
