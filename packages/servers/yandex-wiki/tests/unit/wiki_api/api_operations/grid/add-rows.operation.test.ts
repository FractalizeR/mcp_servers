// tests/unit/wiki_api/api_operations/grid/add-rows.operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AddRowsOperation } from '#wiki_api/api_operations/grid/add-rows.operation.js';
import {
  createMockHttpClient,
  createMockCacheManager,
  createMockLogger,
  createGridFixture,
} from '#helpers/index.js';
import type { IHttpClient } from '@mcp-framework/infrastructure';

describe('AddRowsOperation', () => {
  let operation: AddRowsOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new AddRowsOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('должен добавить строки в grid', async () => {
    const expectedGrid = createGridFixture();
    vi.mocked(mockHttpClient.post).mockResolvedValue(expectedGrid);

    const result = await operation.execute('grid-123', {
      rows: [{ row: ['Value 1', 'Value 2'] }, { row: ['Value 3', 'Value 4'] }],
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/grids/grid-123/rows', {
      rows: [{ row: ['Value 1', 'Value 2'] }, { row: ['Value 3', 'Value 4'] }],
    });
    expect(result).toEqual(expectedGrid);
  });

  it('должен логировать операцию', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createGridFixture());

    await operation.execute('grid-456', {
      rows: [{ row: ['Test'] }],
    });

    expect(mockLogger.info).toHaveBeenCalledWith('Adding rows to grid: grid-456');
  });
});
