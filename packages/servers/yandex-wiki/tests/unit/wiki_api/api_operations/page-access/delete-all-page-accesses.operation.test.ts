// tests/unit/wiki_api/api_operations/page-access/delete-all-page-accesses.operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteAllPageAccessesOperation } from '#wiki_api/api_operations/page-access/delete-all-page-accesses.operation.js';
import { createMockHttpClient, createMockCacheManager, createMockLogger } from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';

describe('DeleteAllPageAccessesOperation', () => {
  let operation: DeleteAllPageAccessesOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new DeleteAllPageAccessesOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('должен удалить все доступы без query-параметров', async () => {
    vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

    await operation.execute({ idx: 123 });

    expect(mockHttpClient.delete).toHaveBeenCalledWith('/v1/pages/123/access');
  });

  it('должен передать фактическое значение prevent_selflock в query', async () => {
    vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

    await operation.execute({ idx: 123, prevent_selflock: true });

    expect(mockHttpClient.delete).toHaveBeenCalledWith(
      '/v1/pages/123/access?prevent_selflock=true'
    );
  });

  it('должен логировать операцию', async () => {
    vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

    await operation.execute({ idx: 1 });

    expect(mockLogger.info).toHaveBeenCalledWith('Deleting ALL personal page accesses on page: 1');
  });
});
