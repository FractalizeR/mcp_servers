// tests/unit/wiki_api/api_operations/page/get-descendants-by-id.operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetDescendantsByIdOperation } from '#wiki_api/api_operations/page/get-descendants-by-id.operation.js';
import {
  createMockHttpClient,
  createMockCacheManager,
  createMockLogger,
  createDescendantsResponseFixture,
} from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';

describe('GetDescendantsByIdOperation', () => {
  let operation: GetDescendantsByIdOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new GetDescendantsByIdOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('должен получить поддерево по id без параметров', async () => {
    const expectedResponse = createDescendantsResponseFixture();
    vi.mocked(mockHttpClient.get).mockResolvedValue(expectedResponse);

    const result = await operation.execute({ idx: 123 });

    expect(mockHttpClient.get).toHaveBeenCalledWith('/v1/pages/123/descendants', undefined);
    expect(result).toEqual(expectedResponse);
  });

  it('должен передать все опциональные параметры в query', async () => {
    vi.mocked(mockHttpClient.get).mockResolvedValue(createDescendantsResponseFixture());

    await operation.execute({
      idx: 456,
      actuality: 'actual',
      cursor: 'cursor-1',
      include_self: true,
      page_size: 75,
      show_all: true,
    });

    expect(mockHttpClient.get).toHaveBeenCalledWith('/v1/pages/456/descendants', {
      actuality: 'actual',
      cursor: 'cursor-1',
      include_self: true,
      page_size: 75,
      show_all: true,
    });
  });

  it('должен логировать операцию', async () => {
    vi.mocked(mockHttpClient.get).mockResolvedValue(createDescendantsResponseFixture());

    await operation.execute({ idx: 789 });

    expect(mockLogger.info).toHaveBeenCalledWith('Getting descendants for page id: 789');
  });
});
