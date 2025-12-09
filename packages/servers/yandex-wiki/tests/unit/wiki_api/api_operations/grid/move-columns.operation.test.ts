// tests/unit/wiki_api/api_operations/grid/move-columns.operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MoveColumnsOperation } from '#wiki_api/api_operations/grid/move-columns.operation.js';
import {
  createMockHttpClient,
  createMockCacheManager,
  createMockLogger,
  createGridFixture,
} from '#helpers/index.js';
import type { IHttpClient } from '@mcp-framework/infrastructure';

describe('MoveColumnsOperation', () => {
  let operation: MoveColumnsOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new MoveColumnsOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('должен переместить колонки в grid', async () => {
    const expectedGrid = createGridFixture();
    vi.mocked(mockHttpClient.post).mockResolvedValue(expectedGrid);

    const result = await operation.execute('grid-123', {
      column_slugs: ['col1', 'col2'],
      after_column_slug: 'col5',
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/grids/grid-123/columns/move', {
      column_slugs: ['col1', 'col2'],
      after_column_slug: 'col5',
    });
    expect(result).toEqual(expectedGrid);
  });

  it('должен логировать операцию', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createGridFixture());

    await operation.execute('grid-456', {
      column_slugs: ['col3'],
      after_column_slug: 'col7',
    });

    expect(mockLogger.info).toHaveBeenCalledWith('Moving columns in grid: grid-456');
  });
});
