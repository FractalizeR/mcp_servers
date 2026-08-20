import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MockHttpClient } from '@fractalizer/mcp-infrastructure/http/client/mock-http-client.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import { GetFiltersOperation } from '#tracker_api/api_operations/filter/get-filters.operation.js';

describe('GetFiltersOperation', () => {
  let operation: GetFiltersOperation;
  let httpClient: MockHttpClient;

  beforeEach(() => {
    httpClient = new MockHttpClient();

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

    operation = new GetFiltersOperation(httpClient, mockCacheManager, mockLogger);
  });

  // Живая проба 2026-08-20: `/v3/filters` — эндпоинт создания, на GET он
  // отвечает 405, то есть инструмент падал всегда. Список личных фильтров
  // лежит на `/v3/myself/favorites/filters` (референсный клиент,
  // `Filters.get_favorites()`).
  it('запрашивает список фильтров, а не эндпоинт создания', async () => {
    httpClient.setResponse('GET', '/v3/myself/favorites/filters', [{ id: '1', name: 'F' }]);

    const result = await operation.execute();

    expect(result.items).toHaveLength(1);
    const paths = httpClient.getRequestHistory().map((entry) => entry.path);
    expect(paths).toEqual(['/v3/myself/favorites/filters']);
    expect(paths).not.toContain('/v3/filters');
  });
});
