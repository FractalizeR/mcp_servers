// tests/unit/wiki_api/api_operations/page/get-descendants-by-slug.operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetDescendantsBySlugOperation } from '#wiki_api/api_operations/page/get-descendants-by-slug.operation.js';
import {
  createMockHttpClient,
  createMockCacheManager,
  createMockLogger,
  createDescendantsResponseFixture,
} from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';

describe('GetDescendantsBySlugOperation', () => {
  let operation: GetDescendantsBySlugOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new GetDescendantsBySlugOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('должен получить поддерево по slug', async () => {
    const expectedResponse = createDescendantsResponseFixture();
    vi.mocked(mockHttpClient.get).mockResolvedValue(expectedResponse);

    const result = await operation.execute({ slug: 'users/testuser/section' });

    expect(mockHttpClient.get).toHaveBeenCalledWith('/v1/pages/descendants', {
      slug: 'users/testuser/section',
    });
    expect(result).toEqual(expectedResponse);
  });

  it('должен передать все опциональные параметры в query', async () => {
    vi.mocked(mockHttpClient.get).mockResolvedValue(createDescendantsResponseFixture());

    await operation.execute({
      slug: 'users/testuser/section',
      actuality: 'obsolete',
      cursor: 'cursor-2',
      include_self: false,
      page_size: 10,
      show_all: false,
    });

    expect(mockHttpClient.get).toHaveBeenCalledWith('/v1/pages/descendants', {
      slug: 'users/testuser/section',
      actuality: 'obsolete',
      cursor: 'cursor-2',
      include_self: false,
      page_size: 10,
      show_all: false,
    });
  });

  it('должен логировать операцию', async () => {
    vi.mocked(mockHttpClient.get).mockResolvedValue(createDescendantsResponseFixture());

    await operation.execute({ slug: 'users/testuser/logged' });

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Getting descendants for page slug: users/testuser/logged'
    );
  });
});
