// tests/unit/wiki_api/api_operations/page/clone-page.operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClonePageOperation } from '#wiki_api/api_operations/page/clone-page.operation.js';
import {
  createMockHttpClient,
  createMockCacheManager,
  createMockLogger,
  createAsyncOperationFixture,
} from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';

describe('ClonePageOperation', () => {
  let operation: ClonePageOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new ClonePageOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('должен клонировать страницу', async () => {
    const expectedResult = createAsyncOperationFixture();
    vi.mocked(mockHttpClient.post).mockResolvedValue(expectedResult);

    const result = await operation.execute(12345, {
      target: 'users/new/cloned-page',
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/pages/12345/clone', {
      target: 'users/new/cloned-page',
    });
    expect(result.operation.type).toBe('clone');
    expect(result.status_url).toBeDefined();
  });

  it('должен передавать опциональные параметры клонирования', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createAsyncOperationFixture());

    await operation.execute(12345, {
      target: 'users/new/cloned-page',
      title: 'New Title',
      recursive: true,
      dry_run: true,
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/pages/12345/clone', {
      target: 'users/new/cloned-page',
      title: 'New Title',
      recursive: true,
      dry_run: true,
    });
  });

  it('должен логировать операцию', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createAsyncOperationFixture());

    await operation.execute(99, { target: 'new/path' });

    expect(mockLogger.info).toHaveBeenCalledWith('Cloning page 99 to new/path');
  });
});
