/**
 * `POST /v3/boards` объявлен устаревшим и молча игнорирует тело — актуальный
 * маршрут `POST /v3/liveBoards/` (0_CONTRACTS.md, D9).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import type { CreateBoardDto } from '#tracker_api/dto/index.js';
import { CreateBoardOperation } from '#tracker_api/api_operations/board/create-board.operation.js';
import { createBoardFixture } from '#helpers/agile.fixture.js';
import { EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';

describe('CreateBoardOperation', () => {
  let operation: CreateBoardOperation;
  let mockHttpClient: IHttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn().mockResolvedValue(null),
      post: vi.fn(),
      patch: vi.fn(),
      put: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
    } as unknown as IHttpClient;

    mockCacheManager = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      has: vi.fn(),
    } as unknown as CacheManager;

    mockLogger = {
      child: vi.fn().mockReturnThis(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    operation = new CreateBoardOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  it('отправляет POST на /v3/liveBoards/ (устаревший /v3/boards молча игнорирует тело)', async () => {
    const inputDto: CreateBoardDto = { name: 'New Board' };
    const mockBoard = createBoardFixture({ id: 42, name: 'New Board' });
    vi.mocked(mockHttpClient.post).mockResolvedValue(mockBoard);

    const result = await operation.execute(inputDto);

    expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/liveBoards/', inputDto);
    expect(result).toEqual(mockBoard);
  });

  it('пробрасывает привязку к очереди через autoFilters.addFilter.liveFilter.fieldValues.queue', async () => {
    const inputDto: CreateBoardDto = {
      name: 'Queue Board',
      autoFilters: {
        addFilter: { liveFilter: { fieldValues: { queue: [{ fixed: 'TEST' }] } }, enabled: true },
      },
    };
    const mockBoard = createBoardFixture({ id: 43, name: 'Queue Board' });
    vi.mocked(mockHttpClient.post).mockResolvedValue(mockBoard);

    await operation.execute(inputDto);

    expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/liveBoards/', inputDto);
  });

  it('инвалидирует кеш созданной доски', async () => {
    const inputDto: CreateBoardDto = { name: 'New Board' };
    const mockBoard = createBoardFixture({ id: 99, name: 'New Board' });
    vi.mocked(mockHttpClient.post).mockResolvedValue(mockBoard);

    await operation.execute(inputDto);

    const cacheKey = EntityCacheKey.createKey(EntityType.BOARD, '99');
    expect(mockCacheManager.delete).toHaveBeenCalledWith(cacheKey);
  });
});
