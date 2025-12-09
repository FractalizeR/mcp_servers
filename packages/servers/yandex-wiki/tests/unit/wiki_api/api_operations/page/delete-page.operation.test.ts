// tests/unit/wiki_api/api_operations/page/delete-page.operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeletePageOperation } from '#wiki_api/api_operations/page/delete-page.operation.js';
import {
  createMockHttpClient,
  createMockCacheManager,
  createMockLogger,
  createDeleteResultFixture,
} from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';

describe('DeletePageOperation', () => {
  let operation: DeletePageOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new DeletePageOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('должен удалить страницу и вернуть recovery token', async () => {
    const expectedResult = createDeleteResultFixture();
    vi.mocked(mockHttpClient.delete).mockResolvedValue(expectedResult);

    const result = await operation.execute(12345);

    expect(mockHttpClient.delete).toHaveBeenCalledWith('/v1/pages/12345');
    expect(result.recovery_token).toBe('recovery-token-abc123');
  });

  it('должен логировать операцию', async () => {
    vi.mocked(mockHttpClient.delete).mockResolvedValue(createDeleteResultFixture());

    await operation.execute(99);

    expect(mockLogger.info).toHaveBeenCalledWith('Deleting page: 99');
  });
});
