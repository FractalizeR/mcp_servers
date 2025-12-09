// tests/unit/wiki_api/api_operations/page/get-page.operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetPageOperation } from '#wiki_api/api_operations/page/get-page.operation.js';
import {
  createMockHttpClient,
  createMockCacheManager,
  createMockLogger,
  createPageFixture,
} from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';

describe('GetPageOperation', () => {
  let operation: GetPageOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new GetPageOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('должен получить страницу по slug', async () => {
    const expectedPage = createPageFixture({ slug: 'users/docs/test' });
    vi.mocked(mockHttpClient.get).mockResolvedValue(expectedPage);

    const result = await operation.execute({ slug: 'users/docs/test' });

    expect(mockHttpClient.get).toHaveBeenCalledWith('/v1/pages', {
      slug: 'users/docs/test',
    });
    expect(result).toEqual(expectedPage);
  });

  it('должен передавать опциональные параметры', async () => {
    const expectedPage = createPageFixture();
    vi.mocked(mockHttpClient.get).mockResolvedValue(expectedPage);

    await operation.execute({
      slug: 'test',
      fields: 'attributes,content',
      raise_on_redirect: true,
      revision_id: 5,
    });

    expect(mockHttpClient.get).toHaveBeenCalledWith('/v1/pages', {
      slug: 'test',
      fields: 'attributes,content',
      raise_on_redirect: true,
      revision_id: 5,
    });
  });

  it('должен логировать операцию', async () => {
    vi.mocked(mockHttpClient.get).mockResolvedValue(createPageFixture());

    await operation.execute({ slug: 'users/test' });

    expect(mockLogger.info).toHaveBeenCalledWith('Getting page by slug: users/test');
  });

  it('должен пробрасывать ошибки HTTP клиента', async () => {
    const error = new Error('Network error');
    vi.mocked(mockHttpClient.get).mockRejectedValue(error);

    await expect(operation.execute({ slug: 'test' })).rejects.toThrow('Network error');
  });
});
