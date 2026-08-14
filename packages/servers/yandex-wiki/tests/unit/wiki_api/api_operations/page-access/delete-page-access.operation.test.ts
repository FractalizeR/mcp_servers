// tests/unit/wiki_api/api_operations/page-access/delete-page-access.operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeletePageAccessOperation } from '#wiki_api/api_operations/page-access/delete-page-access.operation.js';
import { createMockHttpClient, createMockCacheManager, createMockLogger } from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';

describe('DeletePageAccessOperation', () => {
  let operation: DeletePageAccessOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new DeletePageAccessOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('должен удалить доступ без query-параметров', async () => {
    vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

    await operation.execute({ idx: 123, access_id: 'access-1' });

    expect(mockHttpClient.delete).toHaveBeenCalledWith('/v1/pages/123/access/access-1');
  });

  it('должен передать фактическое значение prevent_selflock в query', async () => {
    vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

    await operation.execute({ idx: 123, access_id: 'access-1', prevent_selflock: true });

    expect(mockHttpClient.delete).toHaveBeenCalledWith(
      '/v1/pages/123/access/access-1?prevent_selflock=true'
    );
  });

  it('должен логировать операцию', async () => {
    vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

    await operation.execute({ idx: 1, access_id: 'a1' });

    expect(mockLogger.info).toHaveBeenCalledWith('Deleting page access a1 on page: 1');
  });
});
