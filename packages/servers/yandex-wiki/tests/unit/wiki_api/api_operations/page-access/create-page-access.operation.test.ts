// tests/unit/wiki_api/api_operations/page-access/create-page-access.operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreatePageAccessOperation } from '#wiki_api/api_operations/page-access/create-page-access.operation.js';
import { createMockHttpClient, createMockCacheManager, createMockLogger } from '#helpers/index.js';
import { createPageAccessFixture } from '#helpers/index.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure';

describe('CreatePageAccessOperation', () => {
  let operation: CreatePageAccessOperation;
  let mockHttpClient: IHttpClient;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockLogger = createMockLogger();
    const mockCache = createMockCacheManager();
    operation = new CreatePageAccessOperation(mockHttpClient, mockCache, mockLogger);
  });

  it('должен добавить доступ пользователю', async () => {
    const expected = createPageAccessFixture();
    vi.mocked(mockHttpClient.post).mockResolvedValue(expected);

    const result = await operation.execute(123, { role: 'reader', user: { uid: 'uid-1' } });

    expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/pages/123/access', {
      role: 'reader',
      user: { uid: 'uid-1' },
    });
    expect(result).toEqual(expected);
  });

  it('должен добавить доступ группе', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createPageAccessFixture());

    await operation.execute(123, {
      role: 'editor',
      group: { src: 'staff', id: 'grp-1' },
      inheritance: 'inherited',
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/pages/123/access', {
      role: 'editor',
      group: { src: 'staff', id: 'grp-1' },
      inheritance: 'inherited',
    });
  });

  it('должен логировать операцию', async () => {
    vi.mocked(mockHttpClient.post).mockResolvedValue(createPageAccessFixture());

    await operation.execute(555, { role: 'reader', user: { uid: 'x' } });

    expect(mockLogger.info).toHaveBeenCalledWith('Adding page access on page: 555');
  });
});
