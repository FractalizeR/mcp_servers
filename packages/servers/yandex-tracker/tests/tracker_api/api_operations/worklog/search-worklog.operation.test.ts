import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import { SearchWorklogOperation } from '#tracker_api/api_operations/worklog/search-worklog.operation.js';

function envelope<T>(data: T, headers: Record<string, string> = {}) {
  return { data, headers };
}

describe('SearchWorklogOperation', () => {
  let operation: SearchWorklogOperation;
  let mockHttpClient: IHttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      getWithResponse: vi.fn(),
      postWithResponse: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
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

    operation = new SearchWorklogOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  it('строит тело {createdBy, createdAt:{from,to}} и шлёт POST /v3/worklog/_search', async () => {
    const items = [{ id: '1', self: 'url', version: 1, duration: 'PT1H' }];
    vi.mocked(mockHttpClient.postWithResponse).mockResolvedValue(envelope(items));

    const result = await operation.execute({
      createdBy: 'ivanov',
      createdAtFrom: '2026-08-01T00:00:00.000+0000',
      createdAtTo: '2026-08-14T00:00:00.000+0000',
    });

    expect(mockHttpClient.postWithResponse).toHaveBeenCalledWith(
      // Без явного perPage операция шлёт НАШ явный дефолт DEFAULT_PER_PAGE=50
      // (см. tracker-paginator.util.ts), чтобы perPage был известен buildMeta.
      '/v3/worklog/_search?perPage=50',
      {
        createdBy: 'ivanov',
        createdAt: { from: '2026-08-01T00:00:00.000+0000', to: '2026-08-14T00:00:00.000+0000' },
      },
      undefined,
      true
    );
    expect(result.items).toEqual(items);
  });

  it('без параметров шлёт пустое тело', async () => {
    vi.mocked(mockHttpClient.postWithResponse).mockResolvedValue(envelope([]));

    await operation.execute({});

    expect(mockHttpClient.postWithResponse).toHaveBeenCalledWith(
      '/v3/worklog/_search?perPage=50',
      {},
      undefined,
      true
    );
  });

  it('добавляет perPage в query, если указан', async () => {
    vi.mocked(mockHttpClient.postWithResponse).mockResolvedValue(envelope([]));

    await operation.execute({ perPage: 50 });

    expect(mockHttpClient.postWithResponse).toHaveBeenCalledWith(
      '/v3/worklog/_search?perPage=50',
      {},
      undefined,
      true
    );
  });

  it('пробрасывает ошибку API', async () => {
    vi.mocked(mockHttpClient.postWithResponse).mockRejectedValue(new Error('Network error'));

    await expect(operation.execute({ createdBy: 'ivanov' })).rejects.toThrow('Network error');
  });
});
