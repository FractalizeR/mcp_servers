// tests/unit/wiki_api/api_operations/page/create-page.operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreatePageOperation } from '#wiki_api/api_operations/page/create-page.operation.js';
import {
  createMockHttpClient,
  createMockCacheManager,
  createMockLogger,
  createPageFixture,
} from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';

describe('CreatePageOperation', () => {
  let operation: CreatePageOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new CreatePageOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('должен создать страницу', async () => {
    const expectedPage = createPageFixture({ slug: 'users/new-page' });
    vi.mocked(mockHttpClient.post).mockResolvedValue(expectedPage);

    const result = await operation.execute({
      data: {
        page_type: 'page',
        slug: 'users/new-page',
        title: 'New Page',
      },
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/pages', {
      page_type: 'page',
      slug: 'users/new-page',
      title: 'New Page',
    });
    expect(result).toEqual(expectedPage);
  });

  it('должен создать страницу с контентом', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createPageFixture());

    await operation.execute({
      data: {
        page_type: 'page',
        slug: 'users/test',
        title: 'Test',
        content: '# Hello World',
      },
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/pages', {
      page_type: 'page',
      slug: 'users/test',
      title: 'Test',
      content: '# Hello World',
    });
  });

  it('должен логировать операцию', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createPageFixture());

    await operation.execute({
      data: {
        page_type: 'page',
        slug: 'users/new',
        title: 'New',
      },
    });

    expect(mockLogger.info).toHaveBeenCalledWith('Creating page: users/new');
  });
});
