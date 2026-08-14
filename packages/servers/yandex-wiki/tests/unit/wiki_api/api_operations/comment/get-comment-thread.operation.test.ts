// tests/unit/wiki_api/api_operations/comment/get-comment-thread.operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetCommentThreadOperation } from '#wiki_api/api_operations/comment/get-comment-thread.operation.js';
import {
  createMockHttpClient,
  createMockCacheManager,
  createMockLogger,
  createCommentsResponseFixture,
} from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';

describe('GetCommentThreadOperation', () => {
  let operation: GetCommentThreadOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new GetCommentThreadOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('должен получить тред без опциональных параметров', async () => {
    const expected = createCommentsResponseFixture();
    vi.mocked(mockHttpClient.get).mockResolvedValue(expected);

    const result = await operation.execute({ idx: 123, comment_id: 501 });

    expect(mockHttpClient.get).toHaveBeenCalledWith('/v1/pages/123/comments/501/thread', undefined);
    expect(result).toEqual(expected);
  });

  it('должен передать cursor/page_size в query', async () => {
    vi.mocked(mockHttpClient.get).mockResolvedValue(createCommentsResponseFixture());

    await operation.execute({ idx: 123, comment_id: 501, cursor: 'c1', page_size: 30 });

    expect(mockHttpClient.get).toHaveBeenCalledWith('/v1/pages/123/comments/501/thread', {
      cursor: 'c1',
      page_size: 30,
    });
  });

  it('должен логировать операцию', async () => {
    vi.mocked(mockHttpClient.get).mockResolvedValue(createCommentsResponseFixture());

    await operation.execute({ idx: 1, comment_id: 2 });

    expect(mockLogger.info).toHaveBeenCalledWith('Getting comment thread 2 on page: 1');
  });
});
