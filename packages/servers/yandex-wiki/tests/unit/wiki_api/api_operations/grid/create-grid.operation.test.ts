// tests/unit/wiki_api/api_operations/grid/create-grid.operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateGridOperation } from '#wiki_api/api_operations/grid/create-grid.operation.js';
import {
  createMockHttpClient,
  createMockCacheManager,
  createMockLogger,
  createGridFixture,
} from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';

describe('CreateGridOperation', () => {
  let operation: CreateGridOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new CreateGridOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('должен создать grid', async () => {
    const expectedGrid = createGridFixture({ title: 'New Grid' });
    vi.mocked(mockHttpClient.post).mockResolvedValue(expectedGrid);

    const result = await operation.execute({
      title: 'New Grid',
      page: { slug: 'users/test-page' },
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/grids', {
      title: 'New Grid',
      page: { slug: 'users/test-page' },
    });
    expect(result).toEqual(expectedGrid);
  });

  it('должен логировать операцию', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createGridFixture());

    await operation.execute({
      title: 'Test Grid',
      page: { slug: 'users/test' },
    });

    expect(mockLogger.info).toHaveBeenCalledWith('Creating grid: Test Grid');
  });
});
