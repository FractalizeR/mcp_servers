// tests/unit/wiki_api/api_operations/page-access/update-page-access.operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdatePageAccessOperation } from '#wiki_api/api_operations/page-access/update-page-access.operation.js';
import { createMockHttpClient, createMockCacheManager, createMockLogger } from '#helpers/index.js';
import { createPageAccessFixture } from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';

describe('UpdatePageAccessOperation', () => {
  let operation: UpdatePageAccessOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new UpdatePageAccessOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('должен обновить доступ без query-параметров', async () => {
    const expected = createPageAccessFixture({ role: 'editor' });
    vi.mocked(mockHttpClient.post).mockResolvedValue(expected);

    const result = await operation.execute({
      idx: 123,
      access_id: 'access-1',
      data: { role: 'editor' },
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/pages/123/access/access-1', {
      role: 'editor',
    });
    expect(result).toEqual(expected);
  });

  it('должен передать фактическое значение prevent_selflock (true) в query', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createPageAccessFixture());

    await operation.execute({
      idx: 123,
      access_id: 'access-1',
      data: { role: 'author' },
      prevent_selflock: true,
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith(
      '/v1/pages/123/access/access-1?prevent_selflock=true',
      { role: 'author' }
    );
  });

  it('должен передать фактическое значение prevent_selflock (false), а не "true"', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createPageAccessFixture());

    await operation.execute({
      idx: 123,
      access_id: 'access-1',
      data: { role: 'author' },
      prevent_selflock: false,
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith(
      '/v1/pages/123/access/access-1?prevent_selflock=false',
      { role: 'author' }
    );
  });

  it('должен логировать операцию', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createPageAccessFixture());

    await operation.execute({ idx: 1, access_id: 'a1', data: { role: 'reader' } });

    expect(mockLogger.info).toHaveBeenCalledWith('Updating page access a1 on page: 1');
  });
});
