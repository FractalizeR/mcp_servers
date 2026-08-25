import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import { UpdateBoardColumnOperation } from '#tracker_api/api_operations/board-column/update-board-column.operation.js';
import { createBoardColumnFixture } from '#helpers/board-columns.fixture.js';

describe('UpdateBoardColumnOperation', () => {
  let operation: UpdateBoardColumnOperation;
  let mockHttpClient: IHttpClient;

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as unknown as IHttpClient;

    const mockCacheManager = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      has: vi.fn(),
    } as unknown as CacheManager;

    const mockLogger = {
      child: vi.fn().mockReturnThis(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    operation = new UpdateBoardColumnOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  it('читает колонки доски перед PATCH и обновляет единственную совпавшую по columnId', async () => {
    vi.mocked(mockHttpClient.get).mockResolvedValue([
      createBoardColumnFixture({ id: 1, name: 'Open' }),
      createBoardColumnFixture({ id: 2, name: 'Doing' }),
    ]);
    const updated = createBoardColumnFixture({ id: 2, name: 'Doing', limit: 3 });
    vi.mocked(mockHttpClient.patch).mockResolvedValue(updated);

    const result = await operation.execute({ boardId: '42', columnId: '2', limit: 3 });

    expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/boards/42/columns');
    expect(mockHttpClient.patch).toHaveBeenCalledWith('/v3/boards/42/columns/2', { limit: 3 });
    expect(result).toEqual(updated);
  });

  it('отказывает без PATCH, если ни одна колонка не совпала по columnId', async () => {
    vi.mocked(mockHttpClient.get).mockResolvedValue([createBoardColumnFixture({ id: 2 })]);

    await expect(operation.execute({ boardId: '42', columnId: '1' })).rejects.toThrow(
      'Колонка 1 доски 42 не найдена'
    );
    expect(mockHttpClient.patch).not.toHaveBeenCalled();
  });

  it('отказывает без PATCH, если columnId неоднозначен (несколько колонок с этим id)', async () => {
    vi.mocked(mockHttpClient.get).mockResolvedValue([
      createBoardColumnFixture({ id: 1, name: 'Открыт' }),
      createBoardColumnFixture({ id: 1, name: 'Дубликат' }),
    ]);

    await expect(operation.execute({ boardId: '42', columnId: '1' })).rejects.toThrow(
      /адресована неоднозначно.*"Открыт", "Дубликат"/s
    );
    expect(mockHttpClient.patch).not.toHaveBeenCalled();
  });
});
