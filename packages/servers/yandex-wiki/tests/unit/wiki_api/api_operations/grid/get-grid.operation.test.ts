// tests/unit/wiki_api/api_operations/grid/get-grid.operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetGridOperation } from '#wiki_api/api_operations/grid/get-grid.operation.js';
import { createMockHttpClient, createMockCacheManager, createMockLogger } from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';
import type { GridWithUnknownFields } from '#wiki_api/entities/index.js';

/**
 * Фикстура для создания тестового грида
 */
function createGridFixture(overrides?: Partial<GridWithUnknownFields>): GridWithUnknownFields {
  return {
    id: 'grid-123',
    name: 'Test Grid',
    columns: [],
    rows: [],
    ...overrides,
  } as GridWithUnknownFields;
}

describe('GetGridOperation', () => {
  let operation: GetGridOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new GetGridOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('должен получить грид по ID', async () => {
    const expectedGrid = createGridFixture({ id: 'grid-abc' });
    vi.mocked(mockHttpClient.get).mockResolvedValue(expectedGrid);

    const result = await operation.execute({ idx: 'grid-abc' });

    expect(mockHttpClient.get).toHaveBeenCalledWith('/v1/grids/grid-abc', {});
    expect(result).toEqual(expectedGrid);
  });

  it('должен передавать опциональные параметры', async () => {
    const expectedGrid = createGridFixture();
    vi.mocked(mockHttpClient.get).mockResolvedValue(expectedGrid);

    await operation.execute({
      idx: 'grid-123',
      fields: 'id,name,rows',
      filter: 'status=active',
      only_cols: 'col1,col2',
    });

    expect(mockHttpClient.get).toHaveBeenCalledWith('/v1/grids/grid-123', {
      fields: 'id,name,rows',
      filter: 'status=active',
      only_cols: 'col1,col2',
    });
  });

  it('должен логировать операцию', async () => {
    vi.mocked(mockHttpClient.get).mockResolvedValue(createGridFixture());

    await operation.execute({ idx: 'grid-xyz' });

    expect(mockLogger.info).toHaveBeenCalledWith('Getting grid: grid-xyz');
  });

  it('должен пробрасывать ошибки HTTP клиента', async () => {
    const error = new Error('Network error');
    vi.mocked(mockHttpClient.get).mockRejectedValue(error);

    await expect(operation.execute({ idx: 'grid-123' })).rejects.toThrow('Network error');
  });

  it('должен передавать sort параметр', async () => {
    vi.mocked(mockHttpClient.get).mockResolvedValue(createGridFixture());

    await operation.execute({
      idx: 'grid-123',
      sort: 'name:asc',
    });

    expect(mockHttpClient.get).toHaveBeenCalledWith('/v1/grids/grid-123', {
      sort: 'name:asc',
    });
  });
});
