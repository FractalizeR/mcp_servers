import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import { UpdateEntityOperation } from '#tracker_api/api_operations/entity-api/update-entity.operation.js';

describe('UpdateEntityOperation', () => {
  let operation: UpdateEntityOperation;
  let mockHttpClient: IHttpClient;

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      getWithResponse: vi.fn(),
      postWithResponse: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    } as unknown as IHttpClient;

    const mockCacheManager = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      has: vi.fn(),
    } as unknown as CacheManager;

    const mockLogger = {
      child: vi.fn().mockReturnThis(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    operation = new UpdateEntityOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  it('возвращает обновлённую запись как есть при нормальной форме ответа', async () => {
    const record = { id: '1', self: 'url', version: 2, shortId: 1, entityType: 'goal' };
    vi.mocked(mockHttpClient.patch).mockResolvedValue(record);

    const result = await operation.execute({
      entityType: 'goal',
      entityId: '1',
      extraFields: { summary: 'New summary' },
    });

    expect(result).toBe(record);
    expect(mockHttpClient.patch).toHaveBeenCalledWith('/v3/entities/goal/1', {
      fields: { summary: 'New summary' },
    });
  });

  it('конверт поиска вместо обновлённой записи — явная ошибка, а не тихая порча данных', async () => {
    vi.mocked(mockHttpClient.patch).mockResolvedValue({ hits: 0, pages: 0 });

    await expect(
      operation.execute({ entityType: 'goal', entityId: '1', extraFields: { summary: 'x' } })
    ).rejects.toThrow(/конверт поиска/);
  });
});
