// tests/unit/wiki_api/api_operations/page/append-content.operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppendContentOperation } from '#wiki_api/api_operations/page/append-content.operation.js';
import {
  createMockHttpClient,
  createMockCacheManager,
  createMockLogger,
  createPageFixture,
} from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';

describe('AppendContentOperation', () => {
  let operation: AppendContentOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new AppendContentOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('должен добавить контент к странице', async () => {
    const expectedPage = createPageFixture({ idx: 123 });
    vi.mocked(mockHttpClient.post).mockResolvedValue(expectedPage);

    const result = await operation.execute({
      idx: 123,
      data: {
        content: '## New Section\n\nAdditional content',
      },
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/pages/123/append-content', {
      content: '## New Section\n\nAdditional content',
    });
    expect(result).toEqual(expectedPage);
  });

  it('должен добавить контент с fields', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createPageFixture());

    await operation.execute({
      idx: 456,
      data: { content: 'Appended text' },
      fields: 'content,modified_at',
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith(
      '/v1/pages/456/append-content?fields=content%2Cmodified_at',
      {
        content: 'Appended text',
      }
    );
  });

  it('должен добавить контент с is_silent', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createPageFixture());

    await operation.execute({
      idx: 789,
      data: { content: 'Silent append' },
      is_silent: true,
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith(
      '/v1/pages/789/append-content?is_silent=true',
      {
        content: 'Silent append',
      }
    );
  });

  it('должен добавить контент со всеми параметрами', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createPageFixture());

    await operation.execute({
      idx: 111,
      data: { content: 'Full params append' },
      fields: 'title,content',
      is_silent: true,
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith(
      '/v1/pages/111/append-content?fields=title%2Ccontent&is_silent=true',
      {
        content: 'Full params append',
      }
    );
  });

  it('должен логировать операцию', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createPageFixture());

    await operation.execute({
      idx: 222,
      data: { content: 'Log test content' },
    });

    expect(mockLogger.info).toHaveBeenCalledWith('Appending content to page: 222');
  });
});
