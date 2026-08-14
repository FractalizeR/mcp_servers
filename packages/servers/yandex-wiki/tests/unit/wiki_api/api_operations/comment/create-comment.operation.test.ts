// tests/unit/wiki_api/api_operations/comment/create-comment.operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateCommentOperation } from '#wiki_api/api_operations/comment/create-comment.operation.js';
import { createMockHttpClient, createMockCacheManager, createMockLogger } from '#helpers/index.js';
import { createCommentFixture } from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';

describe('CreateCommentOperation', () => {
  let operation: CreateCommentOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new CreateCommentOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('должен создать комментарий', async () => {
    const expected = createCommentFixture();
    vi.mocked(mockHttpClient.post).mockResolvedValue(expected);

    const result = await operation.execute(123, { body: 'Hello' });

    expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/pages/123/comments', { body: 'Hello' });
    expect(result).toEqual(expected);
  });

  it('должен передать parent_id/thread_id/inline_text как есть', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createCommentFixture());

    await operation.execute(123, {
      body: 'Reply',
      inline_text: 'quoted text',
      parent_id: 501,
      thread_id: 999,
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/pages/123/comments', {
      body: 'Reply',
      inline_text: 'quoted text',
      parent_id: 501,
      thread_id: 999,
    });
  });

  it('должен логировать операцию', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createCommentFixture());

    await operation.execute(555, { body: 'x' });

    expect(mockLogger.info).toHaveBeenCalledWith('Creating comment on page: 555');
  });
});
