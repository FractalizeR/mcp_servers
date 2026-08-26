import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import { EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';
import { UpdateSprintOperation } from '#tracker_api/api_operations/sprint/update-sprint.operation.js';
import { createSprintFixture } from '#helpers/agile.fixture.js';

describe('UpdateSprintOperation', () => {
  let operation: UpdateSprintOperation;
  let mockHttpClient: IHttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;

  beforeEach(() => {
    mockHttpClient = {
      // Операция читает текущую версию перед PATCH: без версии API отвечает 428.
      get: vi.fn().mockResolvedValue(createSprintFixture({ id: 1, version: 7 })),
      post: vi.fn(),
      patch: vi.fn(),
      put: vi.fn(),
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

    operation = new UpdateSprintOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  it('без версии от вызывающего читает текущую и шлёт её в query', async () => {
    const mockSprint = createSprintFixture({ id: 1, version: 7, name: 'Renamed' });
    vi.mocked(mockHttpClient.patch).mockResolvedValue(mockSprint);

    await operation.execute('1', { name: 'Renamed' });

    expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/sprints/1');
    expect(mockHttpClient.patch).toHaveBeenCalledWith('/v3/sprints/1?version=7', {
      name: 'Renamed',
    });
  });

  it('ответ GET без числовой версии даёт понятный отказ, а не ?version=undefined', async () => {
    vi.mocked(mockHttpClient.get).mockResolvedValue({ id: 1, name: 'X' });

    await expect(operation.execute('1', { name: 'X' })).rejects.toThrow(/версию спринта/);
    expect(mockHttpClient.patch).not.toHaveBeenCalled();
  });

  it('переданную версию берёт как есть и лишнего чтения не делает', async () => {
    const mockSprint = createSprintFixture({ id: 1, version: 3, name: 'Renamed' });
    vi.mocked(mockHttpClient.patch).mockResolvedValue(mockSprint);

    await operation.execute('1', { name: 'Renamed' }, 3);

    expect(mockHttpClient.get).not.toHaveBeenCalled();
    expect(mockHttpClient.patch).toHaveBeenCalledWith('/v3/sprints/1?version=3', {
      name: 'Renamed',
    });
  });

  it('version не попадает в тело PATCH', async () => {
    const mockSprint = createSprintFixture({ id: 1, version: 3, name: 'Renamed' });
    vi.mocked(mockHttpClient.patch).mockResolvedValue(mockSprint);

    await operation.execute('1', { name: 'Renamed' }, 3);

    const [, body] = vi.mocked(mockHttpClient.patch).mock.calls[0] ?? [];
    expect(body).not.toHaveProperty('version');
  });

  it('гарантия держится и на уровне операции: version внутри данных всё равно не уходит в тело', async () => {
    // `UpdateSprintDto` несёт индексную сигнатуру `[key: string]: unknown` — вызов
    // операции напрямую (без прохода через `update-sprint.tool.ts`, где та же
    // деструктуризация уже стоит) с версией внутри `data` раньше отправил бы её
    // телом. Регрессия ревью 2026-08-26.
    const mockSprint = createSprintFixture({ id: 1, version: 3, name: 'Renamed' });
    vi.mocked(mockHttpClient.patch).mockResolvedValue(mockSprint);

    await operation.execute('1', { name: 'Renamed', version: 99 }, 3);

    expect(mockHttpClient.patch).toHaveBeenCalledWith('/v3/sprints/1?version=3', {
      name: 'Renamed',
    });
  });

  it('инвалидирует кеш спринта после успешного PATCH', async () => {
    const mockSprint = createSprintFixture({ id: 1, version: 3, name: 'Renamed' });
    vi.mocked(mockHttpClient.patch).mockResolvedValue(mockSprint);

    await operation.execute('1', { name: 'Renamed' }, 3);

    const cacheKey = EntityCacheKey.createKey(EntityType.SPRINT, '1');
    expect(mockCacheManager.delete).toHaveBeenCalledWith(cacheKey);
  });

  it('ошибка PATCH после прочитанной версии не инвалидирует кеш спринта', async () => {
    vi.mocked(mockHttpClient.patch).mockRejectedValue(new Error('Conflict'));

    await expect(operation.execute('1', { name: 'Renamed' })).rejects.toThrow('Conflict');

    expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/sprints/1');
    expect(mockCacheManager.delete).not.toHaveBeenCalled();
  });

  it('пробрасывает ошибку API', async () => {
    vi.mocked(mockHttpClient.patch).mockRejectedValue(new Error('Sprint not found'));

    await expect(operation.execute('1', { name: 'X' }, 1)).rejects.toThrow('Sprint not found');
  });
});
