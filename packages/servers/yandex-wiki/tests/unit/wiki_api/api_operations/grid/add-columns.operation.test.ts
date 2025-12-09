// tests/unit/wiki_api/api_operations/grid/add-columns.operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AddColumnsOperation } from '#wiki_api/api_operations/grid/add-columns.operation.js';
import {
  createMockHttpClient,
  createMockCacheManager,
  createMockLogger,
  createGridFixture,
} from '#helpers/index.js';
import type { IHttpClient } from '@mcp-framework/infrastructure';

describe('AddColumnsOperation', () => {
  let operation: AddColumnsOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new AddColumnsOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('должен добавить колонки в grid', async () => {
    const expectedGrid = createGridFixture();
    vi.mocked(mockHttpClient.post).mockResolvedValue(expectedGrid);

    const result = await operation.execute('grid-123', {
      columns: [
        {
          title: 'New Column',
          slug: 'new_col',
          type: 'string',
          required: false,
        },
      ],
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/grids/grid-123/columns', {
      columns: [
        {
          title: 'New Column',
          slug: 'new_col',
          type: 'string',
          required: false,
        },
      ],
    });
    expect(result).toEqual(expectedGrid);
  });

  it('должен логировать операцию', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createGridFixture());

    await operation.execute('grid-456', {
      columns: [
        {
          title: 'Test Column',
          slug: 'test',
          type: 'number',
          required: true,
        },
      ],
    });

    expect(mockLogger.info).toHaveBeenCalledWith('Adding columns to grid: grid-456');
  });
});
