import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import { CreateEntityOperation } from '#tracker_api/api_operations/entity-api/create-entity.operation.js';

describe('CreateEntityOperation', () => {
  let operation: CreateEntityOperation;
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

    operation = new CreateEntityOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  it('возвращает созданную запись как есть при нормальной форме ответа', async () => {
    const record = { id: '1', self: 'url', version: 1, shortId: 'G-1', entityType: 'goal' };
    vi.mocked(mockHttpClient.post).mockResolvedValue(record);

    const result = await operation.execute({ entityType: 'goal', name: 'Goal 1' });

    expect(result).toBe(record);
    expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/entities/goal', { name: 'Goal 1' });
  });

  it('пустое название — explicit error без похода в HTTP', async () => {
    await expect(operation.execute({ entityType: 'goal', name: '  ' })).rejects.toThrow(
      /название записи обязательно/
    );
    expect(mockHttpClient.post).not.toHaveBeenCalled();
  });

  it('конверт поиска вместо созданной записи — явная ошибка, а не тихая порча данных', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue({ hits: 0, pages: 0 });

    await expect(operation.execute({ entityType: 'goal', name: 'Goal 1' })).rejects.toThrow(
      /конверт поиска/
    );
  });
});
