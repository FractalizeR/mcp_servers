/**
 * Unit тесты для CreateBoardColumnTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateBoardColumnTool } from '#tools/api/boards/create-board-column.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';

describe('CreateBoardColumnTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: CreateBoardColumnTool;

  beforeEach(() => {
    mockTrackerFacade = { createBoardColumn: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new CreateBoardColumnTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации, если statuses пуст', async () => {
    const result = await tool.execute({
      boardId: 'b1',
      name: 'Done',
      statuses: [],
      fields: ['id'],
    });
    expect(result.isError).toBe(true);
  });

  it('создаст колонку', async () => {
    const column = {
      id: 'c1',
      name: 'Done',
      statuses: [{ id: '1', key: 'closed', display: 'Closed' }],
    };
    vi.mocked(mockTrackerFacade.createBoardColumn).mockResolvedValue(column);

    const result = await tool.execute({
      boardId: 'b1',
      name: 'Done',
      statuses: ['closed'],
      fields: ['id', 'name'],
    });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.createBoardColumn).toHaveBeenCalledWith({
      boardId: 'b1',
      name: 'Done',
      statuses: ['closed'],
    });
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.createBoardColumn).mockRejectedValue(new Error('Invalid status'));
    const result = await tool.execute({
      boardId: 'b1',
      name: 'X',
      statuses: ['bad'],
      fields: ['id'],
    });
    expect(result.isError).toBe(true);
  });
});
