// tests/unit/wiki_api/api_operations/grid/move-rows.operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MoveRowsOperation } from '#wiki_api/api_operations/grid/move-rows.operation.js';
import {
  createMockHttpClient,
  createMockCacheManager,
  createMockLogger,
  createGridFixture,
} from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';

describe('MoveRowsOperation', () => {
  let operation: MoveRowsOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new MoveRowsOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('должен переместить строки в grid', async () => {
    const expectedGrid = createGridFixture();
    vi.mocked(mockHttpClient.post).mockResolvedValue(expectedGrid);

    const result = await operation.execute('grid-123', {
      row_ids: ['row-1', 'row-2'],
      after_row_id: 'row-5',
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/grids/grid-123/rows/move', {
      row_ids: ['row-1', 'row-2'],
      after_row_id: 'row-5',
    });
    expect(result).toEqual(expectedGrid);
  });

  it('должен логировать операцию', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createGridFixture());

    await operation.execute('grid-456', {
      row_ids: ['row-3'],
      after_row_id: 'row-7',
    });

    expect(mockLogger.info).toHaveBeenCalledWith('Moving rows in grid: grid-456');
  });
});
