// tests/unit/wiki_api/api_operations/grid/remove-rows.operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RemoveRowsOperation } from '#wiki_api/api_operations/grid/remove-rows.operation.js';
import {
  createMockHttpClient,
  createMockCacheManager,
  createMockLogger,
  createGridFixture,
} from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';

describe('RemoveRowsOperation', () => {
  let operation: RemoveRowsOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new RemoveRowsOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('должен удалить строки из grid', async () => {
    const expectedGrid = createGridFixture();
    vi.mocked(mockHttpClient.delete).mockResolvedValue(expectedGrid);

    const result = await operation.execute('grid-123', {
      row_ids: ['row-1', 'row-2'],
    });

    expect(mockHttpClient.delete).toHaveBeenCalledWith('/v1/grids/grid-123/rows', {
      row_ids: ['row-1', 'row-2'],
    });
    expect(result).toEqual(expectedGrid);
  });

  it('должен логировать операцию', async () => {
    vi.mocked(mockHttpClient.delete).mockResolvedValue(createGridFixture());

    await operation.execute('grid-456', {
      row_ids: ['row-3'],
    });

    expect(mockLogger.info).toHaveBeenCalledWith('Removing rows from grid: grid-456');
  });
});
