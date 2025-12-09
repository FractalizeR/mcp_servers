// tests/unit/wiki_api/api_operations/page/update-page.operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdatePageOperation } from '#wiki_api/api_operations/page/update-page.operation.js';
import {
  createMockHttpClient,
  createMockCacheManager,
  createMockLogger,
  createPageFixture,
} from '#helpers/index.js';
import type { IHttpClient } from '@mcp-framework/infrastructure';

describe('UpdatePageOperation', () => {
  let operation: UpdatePageOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new UpdatePageOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('должен обновить страницу', async () => {
    const expectedPage = createPageFixture({ idx: 123 });
    vi.mocked(mockHttpClient.post).mockResolvedValue(expectedPage);

    const result = await operation.execute({
      idx: 123,
      data: {
        title: 'Updated Title',
      },
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/pages/123', {
      title: 'Updated Title',
    });
    expect(result).toEqual(expectedPage);
  });

  it('должен обновить страницу с allow_merge', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createPageFixture());

    await operation.execute({
      idx: 456,
      data: { title: 'Test' },
      allow_merge: true,
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/pages/456?allow_merge=true', {
      title: 'Test',
    });
  });

  it('должен обновить страницу с fields', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createPageFixture());

    await operation.execute({
      idx: 789,
      data: { content: 'New content' },
      fields: 'title,content,created_at',
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith(
      '/v1/pages/789?fields=title%2Ccontent%2Ccreated_at',
      {
        content: 'New content',
      }
    );
  });

  it('должен обновить страницу с is_silent', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createPageFixture());

    await operation.execute({
      idx: 111,
      data: { title: 'Silent Update' },
      is_silent: true,
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/pages/111?is_silent=true', {
      title: 'Silent Update',
    });
  });

  it('должен обновить страницу со всеми параметрами', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createPageFixture());

    await operation.execute({
      idx: 222,
      data: { title: 'Full Update', content: 'Content' },
      allow_merge: true,
      fields: 'title,content',
      is_silent: true,
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith(
      '/v1/pages/222?allow_merge=true&fields=title%2Ccontent&is_silent=true',
      {
        title: 'Full Update',
        content: 'Content',
      }
    );
  });

  it('должен логировать операцию', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createPageFixture());

    await operation.execute({
      idx: 333,
      data: { title: 'Log Test' },
    });

    expect(mockLogger.info).toHaveBeenCalledWith('Updating page: 333');
  });
});
