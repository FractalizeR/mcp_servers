// tests/unit/wiki_api/api_operations/page/get-page-by-id.operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetPageByIdOperation } from '#wiki_api/api_operations/page/get-page-by-id.operation.js';
import {
  createMockHttpClient,
  createMockCacheManager,
  createMockLogger,
  createPageFixture,
} from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';

describe('GetPageByIdOperation', () => {
  let operation: GetPageByIdOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new GetPageByIdOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('должен получить страницу по ID', async () => {
    const expectedPage = createPageFixture({ id: 12345 });
    vi.mocked(mockHttpClient.get).mockResolvedValue(expectedPage);

    const result = await operation.execute({ idx: 12345 });

    expect(mockHttpClient.get).toHaveBeenCalledWith('/v1/pages/12345', undefined);
    expect(result).toEqual(expectedPage);
  });

  it('должен передавать опциональные параметры', async () => {
    vi.mocked(mockHttpClient.get).mockResolvedValue(createPageFixture());

    await operation.execute({
      idx: 12345,
      fields: 'attributes,content',
      raise_on_redirect: true,
      revision_id: 10,
    });

    expect(mockHttpClient.get).toHaveBeenCalledWith('/v1/pages/12345', {
      fields: 'attributes,content',
      raise_on_redirect: true,
      revision_id: 10,
    });
  });

  it('должен логировать операцию', async () => {
    vi.mocked(mockHttpClient.get).mockResolvedValue(createPageFixture());

    await operation.execute({ idx: 99 });

    expect(mockLogger.info).toHaveBeenCalledWith('Getting page by id: 99');
  });
});
