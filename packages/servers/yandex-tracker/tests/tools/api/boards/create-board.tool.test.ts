/**
 * Unit тесты для CreateBoardTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateBoardTool } from '#tools/api/boards/create-board.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';

describe('CreateBoardTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: CreateBoardTool;

  beforeEach(() => {
    mockTrackerFacade = { createBoard: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new CreateBoardTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('описание queue должно называть ключ очереди, а не ID', () => {
      const definition = tool.getDefinition();
      const queueProp = definition.inputSchema.properties?.['queue'] as { description?: string };

      expect(queueProp.description ?? '').toMatch(/ключ/i);
    });

    it('описание boardPermissionsTemplate должно называть допустимые значения', () => {
      const definition = tool.getDefinition();
      const templateProp = definition.inputSchema.properties?.['boardPermissionsTemplate'] as {
        description?: string;
      };

      expect(templateProp.description ?? '').toContain('private');
      expect(templateProp.description ?? '').toContain('public');
    });
  });

  it('вернёт ошибку валидации, если name не указан', async () => {
    const result = await tool.execute({ fields: ['id'] });
    expect(result.isError).toBe(true);
  });

  it('создаст доску с минимальными полями', async () => {
    const board = { id: 1, self: 'url', version: 1, name: 'New Board' };
    vi.mocked(mockTrackerFacade.createBoard).mockResolvedValue(board);

    const result = await tool.execute({ name: 'New Board', fields: ['id', 'name'] });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.createBoard).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New Board' })
    );
  });

  it('отобразит параметр queue в autoFilters.addFilter.liveFilter.fieldValues.queue', async () => {
    const board = { id: 1, self: 'url', version: 1, name: 'Queue Board' };
    vi.mocked(mockTrackerFacade.createBoard).mockResolvedValue(board);

    const result = await tool.execute({
      name: 'Queue Board',
      queue: 'TEST',
      fields: ['id', 'name'],
    });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.createBoard).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Queue Board',
        autoFilters: {
          addFilter: {
            liveFilter: { fieldValues: { queue: [{ fixed: 'TEST' }] } },
            enabled: true,
          },
        },
      })
    );
    const [callArgs] = vi.mocked(mockTrackerFacade.createBoard).mock.calls[0] ?? [];
    expect(callArgs).not.toHaveProperty('queue');
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.createBoard).mockRejectedValue(new Error('Permission denied'));
    const result = await tool.execute({ name: 'X', fields: ['id'] });
    expect(result.isError).toBe(true);
  });
});
