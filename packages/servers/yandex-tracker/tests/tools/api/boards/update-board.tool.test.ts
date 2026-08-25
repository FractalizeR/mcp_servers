/**
 * Unit тесты для UpdateBoardTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UpdateBoardTool } from '#tools/api/boards/update-board.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';

describe('UpdateBoardTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: UpdateBoardTool;

  beforeEach(() => {
    mockTrackerFacade = { updateBoard: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new UpdateBoardTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации при пустом boardId', async () => {
    const result = await tool.execute({ boardId: '', fields: ['id'] });
    expect(result.isError).toBe(true);
  });

  it('обновит доску', async () => {
    const board = { id: 1, self: 'url', version: 2, name: 'Renamed' };
    vi.mocked(mockTrackerFacade.updateBoard).mockResolvedValue(board);

    const result = await tool.execute({
      boardId: '1',
      name: 'Renamed',
      fields: ['id', 'name'],
    });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.updateBoard).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({ name: 'Renamed' })
    );
  });

  it('примет числовой boardId (как отдаёт get_boards) и дойдёт до того же запроса', async () => {
    const board = { id: 1, self: 'url', version: 2, name: 'Renamed' };
    vi.mocked(mockTrackerFacade.updateBoard).mockResolvedValue(board);

    const result = await tool.execute({
      boardId: 1,
      name: 'Renamed',
      fields: ['id', 'name'],
    });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.updateBoard).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({ name: 'Renamed' })
    );
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.updateBoard).mockRejectedValue(new Error('Not found'));
    const result = await tool.execute({ boardId: '999', fields: ['id'] });
    expect(result.isError).toBe(true);
  });
});
