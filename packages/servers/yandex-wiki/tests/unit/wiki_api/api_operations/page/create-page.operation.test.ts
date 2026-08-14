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

  // Дефект 7.1.B №1: is_silent и fields принимались операцией, но никогда не
  // попадали в запрос — комментарий в старом коде прямо это объяснял
  // ограничением httpClient.post, которого на самом деле не было (соседние
  // update-page/append-content собирают query-строку тем же способом).
  it('должен передать is_silent в query string (дефект 7.1.B №1)', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createPageFixture());

    await operation.execute({
      data: { page_type: 'page', slug: 'users/silent', title: 'Silent' },
      is_silent: true,
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith(
      '/v1/pages?is_silent=true',
      expect.objectContaining({ slug: 'users/silent' })
    );
  });

  it('должен передать fields в query string (дефект 7.1.B №1)', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createPageFixture());

    await operation.execute({
      data: { page_type: 'page', slug: 'users/fields', title: 'Fields' },
      fields: 'attributes,content',
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith(
      '/v1/pages?fields=attributes%2Ccontent',
      expect.objectContaining({ slug: 'users/fields' })
    );
  });

  it('должен передать оба query-параметра одновременно', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createPageFixture());

    await operation.execute({
      data: { page_type: 'page', slug: 'users/both', title: 'Both' },
      fields: 'content',
      is_silent: true,
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith(
      '/v1/pages?fields=content&is_silent=true',
      expect.objectContaining({ slug: 'users/both' })
    );
  });
});
