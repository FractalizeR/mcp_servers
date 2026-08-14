// tests/unit/wiki_api/api_operations/search/search.operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchOperation } from '#wiki_api/api_operations/search/search.operation.js';
import { createMockHttpClient, createMockCacheManager, createMockLogger } from '#helpers/index.js';
import { createSearchResponseFixture } from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';

describe('SearchOperation', () => {
  let operation: SearchOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new SearchOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('должен выполнить POST /v1/search с idempotencyDeclared: true', async () => {
    const expectedResponse = createSearchResponseFixture();
    vi.mocked(mockHttpClient.post).mockResolvedValue(expectedResponse);

    const result = await operation.execute({ query: 'test query' });

    expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/search', { query: 'test query' }, true);
    expect(result).toEqual(expectedResponse);
  });

  it('должен передать все опциональные поля и filters как есть', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createSearchResponseFixture());

    await operation.execute({
      query: 'test',
      cursor: 2,
      limit: 25,
      order_by: 'modified_date',
      highlight: true,
      filters: {
        type: 'page',
        authors: [{ uid: 'uid-1' }],
        cluster: 'my-cluster',
        created_at: { from: '2024-01-01T00:00:00Z' },
        modified_at: { to: '2024-02-01T00:00:00Z' },
        show_obsolete: true,
      },
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith(
      '/v1/search',
      {
        query: 'test',
        cursor: 2,
        limit: 25,
        order_by: 'modified_date',
        highlight: true,
        filters: {
          type: 'page',
          authors: [{ uid: 'uid-1' }],
          cluster: 'my-cluster',
          created_at: { from: '2024-01-01T00:00:00Z' },
          modified_at: { to: '2024-02-01T00:00:00Z' },
          show_obsolete: true,
        },
      },
      true
    );
  });

  it('должен логировать операцию', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createSearchResponseFixture());

    await operation.execute({ query: 'logged query' });

    expect(mockLogger.info).toHaveBeenCalledWith('Searching wiki: logged query');
  });
});
