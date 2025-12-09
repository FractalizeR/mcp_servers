// tests/unit/wiki_api/api_operations/grid/delete-grid.operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteGridOperation } from '#wiki_api/api_operations/grid/delete-grid.operation.js';
import {
  createMockHttpClient,
  createMockCacheManager,
  createMockLogger,
  createDeleteGridResultFixture,
} from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';

describe('DeleteGridOperation', () => {
  let operation: DeleteGridOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new DeleteGridOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('должен удалить grid', async () => {
    const expectedResult = createDeleteGridResultFixture();
    vi.mocked(mockHttpClient.delete).mockResolvedValue(expectedResult);

    const result = await operation.execute('grid-123');

    expect(mockHttpClient.delete).toHaveBeenCalledWith('/v1/grids/grid-123');
    expect(result).toEqual(expectedResult);
  });

  it('должен логировать операцию', async () => {
    vi.mocked(mockHttpClient.delete).mockResolvedValue(createDeleteGridResultFixture());

    await operation.execute('grid-456');

    expect(mockLogger.info).toHaveBeenCalledWith('Deleting grid: grid-456');
  });
});
