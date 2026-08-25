/**
 * Unit тесты для DeleteBoardColumnTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeleteBoardColumnTool } from '#tools/api/boards/delete-board-column.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';

describe('DeleteBoardColumnTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: DeleteBoardColumnTool;

  beforeEach(() => {
    mockTrackerFacade = { deleteBoardColumn: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new DeleteBoardColumnTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации при пустом columnId', async () => {
    const result = await tool.execute({ boardId: 'b1', columnId: '' });
    expect(result.isError).toBe(true);
  });

  it('удалит колонку', async () => {
    vi.mocked(mockTrackerFacade.deleteBoardColumn).mockResolvedValue(undefined);

    const result = await tool.execute({ boardId: 'b1', columnId: 'c1' });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.deleteBoardColumn).toHaveBeenCalledWith({
      boardId: 'b1',
      columnId: 'c1',
    });
  });

  it('примет числовые boardId/columnId (как отдаёт get_boards/get_board_columns) и дойдёт до того же запроса', async () => {
    vi.mocked(mockTrackerFacade.deleteBoardColumn).mockResolvedValue(undefined);

    const result = await tool.execute({ boardId: 42, columnId: 1 });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.deleteBoardColumn).toHaveBeenCalledWith({
      boardId: '42',
      columnId: '1',
    });
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.deleteBoardColumn).mockRejectedValue(new Error('Not found'));
    const result = await tool.execute({ boardId: 'b1', columnId: 'c1' });
    expect(result.isError).toBe(true);
  });
});
