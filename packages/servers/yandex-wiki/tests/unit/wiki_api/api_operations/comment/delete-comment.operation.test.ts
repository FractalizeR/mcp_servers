// tests/unit/wiki_api/api_operations/comment/delete-comment.operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteCommentOperation } from '#wiki_api/api_operations/comment/delete-comment.operation.js';
import { createMockHttpClient, createMockCacheManager, createMockLogger } from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';

describe('DeleteCommentOperation', () => {
  let operation: DeleteCommentOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new DeleteCommentOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('должен удалить комментарий и вернуть comments_count', async () => {
    vi.mocked(mockHttpClient.delete).mockResolvedValue({ comments_count: 4 });

    const result = await operation.execute(123, 501);

    expect(mockHttpClient.delete).toHaveBeenCalledWith('/v1/pages/123/comments/501');
    expect(result).toEqual({ comments_count: 4 });
  });

  it('должен логировать операцию', async () => {
    vi.mocked(mockHttpClient.delete).mockResolvedValue({ comments_count: 0 });

    await operation.execute(1, 2);

    expect(mockLogger.info).toHaveBeenCalledWith('Deleting comment 2 on page: 1');
  });
});
