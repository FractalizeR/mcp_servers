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

  it('version не объявлен и до API не доезжает', async () => {
    // `PATCH /v3/boards/{id}` отвечает `400 version: Incorrect data format` при любом
    // значении, включая текущую версию доски (живая проба 2026-08-25). Параметра нет
    // в схеме, поэтому клиент отклонит его по additionalProperties, а присланный в
    // обход — не попадёт в тело запроса.
    const definition = tool.getDefinition();
    const properties = (definition.inputSchema as { properties?: Record<string, unknown> })
      .properties;
    expect(properties?.['version']).toBeUndefined();

    vi.mocked(mockTrackerFacade.updateBoard).mockResolvedValue({
      id: 5,
      self: 'url',
      version: 6,
      name: 'X',
    });
    await tool.execute({ boardId: '5', name: 'X', version: 6, fields: ['id'] });

    expect(mockTrackerFacade.updateBoard).toHaveBeenCalledWith(
      '5',
      expect.not.objectContaining({ version: expect.anything() })
    );
  });

  it('не принимает orderBy без filter: API отвечает 422', async () => {
    const result = await tool.execute({ boardId: '5', orderBy: 'created', fields: ['id'] });

    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).toContain('filter');
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.updateBoard).mockRejectedValue(new Error('Not found'));
    const result = await tool.execute({ boardId: '999', fields: ['id'] });
    expect(result.isError).toBe(true);
  });
});
