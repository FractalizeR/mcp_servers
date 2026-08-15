import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import { GetEntityOperation } from '#tracker_api/api_operations/entity-api/get-entity.operation.js';

describe('GetEntityOperation', () => {
  let operation: GetEntityOperation;
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

    operation = new GetEntityOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  it('возвращает запись как есть при нормальной форме ответа', async () => {
    const record = { id: '1', self: 'url', version: 1, shortId: 'G-1', entityType: 'goal' };
    vi.mocked(mockHttpClient.get).mockResolvedValue(record);

    const result = await operation.execute({ entityType: 'goal', entityId: '1' });

    expect(result).toBe(record);
    expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/entities/goal/1');
  });

  // Диагностика на случай, если конверт поиска {hits,pages,values} (см.
  // find-entities.operation.ts) когда-нибудь протечёт и в single-record ветку.
  it('конверт поиска вместо одной записи — явная ошибка, а не тихая порча данных', async () => {
    vi.mocked(mockHttpClient.get).mockResolvedValue({ hits: 1, pages: 1, values: [{ id: '1' }] });

    await expect(operation.execute({ entityType: 'goal', entityId: '1' })).rejects.toThrow(
      /конверт поиска/
    );
  });
});
