import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import { FindEntitiesOperation } from '#tracker_api/api_operations/entity-api/find-entities.operation.js';

function envelope<T>(data: T, headers: Record<string, string> = {}) {
  return { data, headers };
}

describe('FindEntitiesOperation', () => {
  let operation: FindEntitiesOperation;
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

    operation = new FindEntitiesOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  it('первая выборка: POST /v3/entities/{entityType}/_search, single-page без Link', async () => {
    const items = [{ id: '1', self: 'url', version: 1, shortId: 'G-1', entityType: 'goal' }];
    vi.mocked(mockHttpClient.postWithResponse).mockResolvedValue(envelope(items));

    const result = await operation.execute({ entityType: 'goal', searchString: 'revenue' });

    expect(mockHttpClient.postWithResponse).toHaveBeenCalledWith(
      '/v3/entities/goal/_search',
      { input: 'revenue' },
      undefined,
      true
    );
    expect(result.items).toEqual(items);
    expect(result.pagination.hasNextPage).toBe(false);
  });

  it('cursor с несовпадающим хешем критериев — explicit error, без похода в HTTP не имеет значения (используется decode)', async () => {
    // Собираем валидный курсор для entityType=goal с ОДНИМИ критериями,
    // затем пробуем возобновить с ДРУГИМИ критериями — хеш не совпадёт.
    const firstItems = [{ id: '1', self: 'url', version: 1, shortId: 'G-1', entityType: 'goal' }];
    vi.mocked(mockHttpClient.postWithResponse).mockResolvedValueOnce(
      envelope(firstItems, { link: '</v3/entities/goal/_search?page=2>; rel="next"' })
    );

    const first = await operation.execute({ entityType: 'goal', searchString: 'revenue' });
    const cursor = first.pagination.nextCursor;
    expect(cursor).toBeDefined();

    await expect(
      operation.execute({
        entityType: 'goal',
        searchString: 'DIFFERENT CRITERIA',
        cursor,
      })
    ).rejects.toThrow(/не совпадают с курсором/);
  });

  it('cursor с совпадающим хешем — резюмирует по декодированному пути', async () => {
    const firstItems = [{ id: '1', self: 'url', version: 1, shortId: 'G-1', entityType: 'goal' }];
    vi.mocked(mockHttpClient.postWithResponse).mockResolvedValueOnce(
      envelope(firstItems, { link: '</v3/entities/goal/_search?page=2>; rel="next"' })
    );

    const first = await operation.execute({ entityType: 'goal', searchString: 'revenue' });
    const cursor = first.pagination.nextCursor as string;

    const secondItems = [{ id: '2', self: 'url', version: 1, shortId: 'G-2', entityType: 'goal' }];
    vi.mocked(mockHttpClient.postWithResponse).mockResolvedValueOnce(envelope(secondItems));

    const second = await operation.execute({
      entityType: 'goal',
      searchString: 'revenue',
      cursor,
    });

    expect(second.items).toEqual(secondItems);
    expect(mockHttpClient.postWithResponse).toHaveBeenLastCalledWith(
      '/v3/entities/goal/_search?page=2',
      { input: 'revenue' },
      undefined,
      true
    );
  });
});
