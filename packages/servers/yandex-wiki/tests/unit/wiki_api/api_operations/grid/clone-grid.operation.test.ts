// tests/unit/wiki_api/api_operations/grid/clone-grid.operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CloneGridOperation } from '#wiki_api/api_operations/grid/clone-grid.operation.js';
import {
  createMockHttpClient,
  createMockCacheManager,
  createMockLogger,
  createAsyncOperationFixture,
} from '#helpers/index.js';
import type { IHttpClient } from '@mcp-framework/infrastructure';

describe('CloneGridOperation', () => {
  let operation: CloneGridOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new CloneGridOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('должен клонировать grid', async () => {
    const expectedResult = createAsyncOperationFixture();
    vi.mocked(mockHttpClient.post).mockResolvedValue(expectedResult);

    const result = await operation.execute('grid-123', {
      target: 'users/new-grid',
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/grids/grid-123/clone', {
      target: 'users/new-grid',
    });
    expect(result).toEqual(expectedResult);
  });

  it('должен клонировать grid с заголовком', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createAsyncOperationFixture());

    await operation.execute('grid-456', {
      target: 'users/cloned-grid',
      title: 'Cloned Grid',
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/grids/grid-456/clone', {
      target: 'users/cloned-grid',
      title: 'Cloned Grid',
    });
  });

  it('должен логировать операцию', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createAsyncOperationFixture());

    await operation.execute('grid-789', {
      target: 'users/destination',
    });

    expect(mockLogger.info).toHaveBeenCalledWith('Cloning grid grid-789 to users/destination');
  });
});
