// tests/unit/wiki_api/api_operations/comment/get-comments.operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetCommentsOperation } from '#wiki_api/api_operations/comment/get-comments.operation.js';
import {
  createMockHttpClient,
  createMockCacheManager,
  createMockLogger,
  createCommentsResponseFixture,
} from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';

describe('GetCommentsOperation', () => {
  let operation: GetCommentsOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new GetCommentsOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('должен получить комментарии без параметров', async () => {
    const expectedResponse = createCommentsResponseFixture();
    vi.mocked(mockHttpClient.get).mockResolvedValue(expectedResponse);

    const result = await operation.execute({ idx: 123 });

    expect(mockHttpClient.get).toHaveBeenCalledWith('/v1/pages/123/comments', undefined);
    expect(result).toEqual(expectedResponse);
  });

  it('должен передать все опциональные параметры в query', async () => {
    vi.mocked(mockHttpClient.get).mockResolvedValue(createCommentsResponseFixture());

    await operation.execute({
      idx: 456,
      cursor: 'cursor-1',
      order_direction: 'desc',
      page_size: 75,
      status_filter: 'unresolved',
    });

    expect(mockHttpClient.get).toHaveBeenCalledWith('/v1/pages/456/comments', {
      cursor: 'cursor-1',
      order_direction: 'desc',
      page_size: 75,
      status_filter: 'unresolved',
    });
  });

  it('должен логировать операцию', async () => {
    vi.mocked(mockHttpClient.get).mockResolvedValue(createCommentsResponseFixture());

    await operation.execute({ idx: 789 });

    expect(mockLogger.info).toHaveBeenCalledWith('Getting comments for page: 789');
  });
});
