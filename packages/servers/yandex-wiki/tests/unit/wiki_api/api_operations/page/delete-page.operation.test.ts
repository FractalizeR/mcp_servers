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

    const result = await operation.execute({ idx: 12345 });

    expect(mockHttpClient.delete).toHaveBeenCalledWith('/v1/pages/12345');
    expect(result.recovery_token).toBe('recovery-token-abc123');
  });

  it('должен логировать операцию', async () => {
    vi.mocked(mockHttpClient.delete).mockResolvedValue(createDeleteResultFixture());

    await operation.execute({ idx: 99 });

    expect(mockLogger.info).toHaveBeenCalledWith('Deleting page: 99');
  });

  // Дефект 7.1.B №4: allow_recursive/recursive не поддерживались вовсе —
  // регрессия падала бы до фикса, т.к. execute() принимал только number
  // и не строил query-строку.
  it('должен передать allow_recursive в query string', async () => {
    vi.mocked(mockHttpClient.delete).mockResolvedValue(createDeleteResultFixture());

    await operation.execute({ idx: 12345, allow_recursive: true });

    expect(mockHttpClient.delete).toHaveBeenCalledWith('/v1/pages/12345?allow_recursive=true');
  });

  it('должен передать recursive в query string', async () => {
    vi.mocked(mockHttpClient.delete).mockResolvedValue(createDeleteResultFixture());

    await operation.execute({ idx: 12345, recursive: true });

    expect(mockHttpClient.delete).toHaveBeenCalledWith('/v1/pages/12345?recursive=true');
  });

  it('должен передать оба флага вместе', async () => {
    vi.mocked(mockHttpClient.delete).mockResolvedValue(createDeleteResultFixture());

    await operation.execute({ idx: 12345, allow_recursive: true, recursive: true });

    expect(mockHttpClient.delete).toHaveBeenCalledWith(
      '/v1/pages/12345?allow_recursive=true&recursive=true'
    );
  });
});
