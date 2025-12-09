// tests/unit/wiki_api/api_operations/grid/remove-columns.operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RemoveColumnsOperation } from '#wiki_api/api_operations/grid/remove-columns.operation.js';
import {
  createMockHttpClient,
  createMockCacheManager,
  createMockLogger,
  createGridFixture,
} from '#helpers/index.js';
import type { IHttpClient } from '@mcp-framework/infrastructure';

describe('RemoveColumnsOperation', () => {
  let operation: RemoveColumnsOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new RemoveColumnsOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('должен удалить колонки из grid', async () => {
    const expectedGrid = createGridFixture();
    vi.mocked(mockHttpClient.delete).mockResolvedValue(expectedGrid);

    const result = await operation.execute('grid-123', {
      column_slugs: ['col1', 'col2'],
    });

    expect(mockHttpClient.delete).toHaveBeenCalledWith('/v1/grids/grid-123/columns', {
      column_slugs: ['col1', 'col2'],
    });
    expect(result).toEqual(expectedGrid);
  });

  it('должен логировать операцию', async () => {
    vi.mocked(mockHttpClient.delete).mockResolvedValue(createGridFixture());

    await operation.execute('grid-456', {
      column_slugs: ['col3'],
    });

    expect(mockLogger.info).toHaveBeenCalledWith('Removing columns from grid: grid-456');
  });
});
