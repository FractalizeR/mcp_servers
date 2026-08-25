/**
 * Unit тесты для UpdateBoardColumnTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UpdateBoardColumnTool } from '#tools/api/boards/update-board-column.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';

describe('UpdateBoardColumnTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: UpdateBoardColumnTool;

  beforeEach(() => {
    mockTrackerFacade = { updateBoardColumn: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new UpdateBoardColumnTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации при пустом columnId', async () => {
    const result = await tool.execute({ boardId: 'b1', columnId: '', fields: ['id'] });
    expect(result.isError).toBe(true);
  });

  it('обновит WIP-лимит колонки', async () => {
    const column = { id: 1, name: 'Doing', limit: 3 };
    vi.mocked(mockTrackerFacade.updateBoardColumn).mockResolvedValue(column);

    const result = await tool.execute({
      boardId: 'b1',
      columnId: 'c1',
      limit: 3,
      fields: ['id', 'limit'],
    });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.updateBoardColumn).toHaveBeenCalledWith({
      boardId: 'b1',
      columnId: 'c1',
      limit: 3,
    });
  });

  it('примет числовые boardId/columnId (как отдаёт get_boards/get_board_columns) и дойдёт до того же запроса', async () => {
    const column = { id: 1, name: 'Doing', limit: 3 };
    vi.mocked(mockTrackerFacade.updateBoardColumn).mockResolvedValue(column);

    const result = await tool.execute({
      boardId: 42,
      columnId: 1,
      limit: 3,
      fields: ['id', 'limit'],
    });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.updateBoardColumn).toHaveBeenCalledWith({
      boardId: '42',
      columnId: '1',
      limit: 3,
    });
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.updateBoardColumn).mockRejectedValue(new Error('Not found'));
    const result = await tool.execute({ boardId: 'b1', columnId: 'c1', fields: ['id'] });
    expect(result.isError).toBe(true);
  });
});
