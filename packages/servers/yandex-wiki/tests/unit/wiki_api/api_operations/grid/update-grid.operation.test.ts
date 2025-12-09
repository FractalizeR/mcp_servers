// tests/unit/wiki_api/api_operations/grid/update-grid.operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateGridOperation } from '#wiki_api/api_operations/grid/update-grid.operation.js';
import {
  createMockHttpClient,
  createMockCacheManager,
  createMockLogger,
  createGridFixture,
} from '#helpers/index.js';
import type { IHttpClient } from '@mcp-framework/infrastructure';

describe('UpdateGridOperation', () => {
  let operation: UpdateGridOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new UpdateGridOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('должен обновить grid', async () => {
    const expectedGrid = createGridFixture({ title: 'Updated Grid' });
    vi.mocked(mockHttpClient.post).mockResolvedValue(expectedGrid);

    const result = await operation.execute('grid-123', {
      title: 'Updated Grid',
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/grids/grid-123', {
      title: 'Updated Grid',
    });
    expect(result).toEqual(expectedGrid);
  });

  it('должен логировать операцию', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createGridFixture());

    await operation.execute('grid-456', {
      title: 'Test Update',
    });

    expect(mockLogger.info).toHaveBeenCalledWith('Updating grid: grid-456');
  });
});
