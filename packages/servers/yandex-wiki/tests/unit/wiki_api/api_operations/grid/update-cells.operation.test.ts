// tests/unit/wiki_api/api_operations/grid/update-cells.operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateCellsOperation } from '#wiki_api/api_operations/grid/update-cells.operation.js';
import {
  createMockHttpClient,
  createMockCacheManager,
  createMockLogger,
  createGridFixture,
} from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';

describe('UpdateCellsOperation', () => {
  let operation: UpdateCellsOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new UpdateCellsOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('должен обновить ячейки в grid', async () => {
    const expectedGrid = createGridFixture();
    vi.mocked(mockHttpClient.post).mockResolvedValue(expectedGrid);

    const result = await operation.execute('grid-123', {
      cells: [
        {
          row_id: 'row-1',
          column_slug: 'col1',
          value: 'Updated Value',
        },
      ],
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/grids/grid-123/cells', {
      cells: [
        {
          row_id: 'row-1',
          column_slug: 'col1',
          value: 'Updated Value',
        },
      ],
    });
    expect(result).toEqual(expectedGrid);
  });

  it('должен логировать операцию', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createGridFixture());

    await operation.execute('grid-456', {
      cells: [
        {
          row_id: 'row-2',
          column_slug: 'col2',
          value: 'Test',
        },
      ],
    });

    expect(mockLogger.info).toHaveBeenCalledWith('Updating cells in grid: grid-456');
  });
});
