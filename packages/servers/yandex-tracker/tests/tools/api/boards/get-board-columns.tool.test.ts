/**
 * Unit тесты для GetBoardColumnsTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetBoardColumnsTool } from '#tools/api/boards/get-board-columns.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';

function paginated<T>(items: T[]) {
  return {
    items,
    pagination: {
      hasNextPage: false,
      fetchedAll: true,
      truncated: false,
      hasError: false,
      pagesFetched: 1,
    },
  };
}

describe('GetBoardColumnsTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetBoardColumnsTool;

  beforeEach(() => {
    mockTrackerFacade = { getBoardColumns: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new GetBoardColumnsTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации при пустом boardId', async () => {
    const result = await tool.execute({ boardId: '', fields: ['id'] });
    expect(result.isError).toBe(true);
  });

  it('вернёт список колонок', async () => {
    const columns = [{ id: 'c1', name: 'To Do' }];
    vi.mocked(mockTrackerFacade.getBoardColumns).mockResolvedValue(paginated(columns));

    const result = await tool.execute({ boardId: 'b1', fields: ['id', 'name'] });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.getBoardColumns).toHaveBeenCalledWith({ boardId: 'b1' });
    const parsed = JSON.parse(result.content[0]?.text || '{}') as { data: { count: number } };
    expect(parsed.data.count).toBe(1);
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.getBoardColumns).mockRejectedValue(new Error('Not found'));
    const result = await tool.execute({ boardId: 'b1', fields: ['id'] });
    expect(result.isError).toBe(true);
  });
});
