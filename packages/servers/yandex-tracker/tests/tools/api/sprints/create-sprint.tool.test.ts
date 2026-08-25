/**
 * Unit тесты для CreateSprintTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateSprintTool } from '#tools/api/sprints/create-sprint.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';

describe('CreateSprintTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: CreateSprintTool;

  beforeEach(() => {
    mockTrackerFacade = { createSprint: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new CreateSprintTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации, если board не указан', async () => {
    const result = await tool.execute({ name: 'Sprint 1', fields: ['id'] });
    expect(result.isError).toBe(true);
  });

  it('создаст спринт', async () => {
    const sprint = { id: 1, self: 'url', version: 1, name: 'Sprint 1' };
    vi.mocked(mockTrackerFacade.createSprint).mockResolvedValue(sprint);

    const result = await tool.execute({
      name: 'Sprint 1',
      board: 'b1',
      fields: ['id', 'name'],
    });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.createSprint).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Sprint 1', board: 'b1' })
    );
  });

  it('примет числовой board (как отдаёт get_boards) и дойдёт до того же запроса', async () => {
    const sprint = { id: 1, self: 'url', version: 1, name: 'Sprint 1' };
    vi.mocked(mockTrackerFacade.createSprint).mockResolvedValue(sprint);

    const result = await tool.execute({
      name: 'Sprint 1',
      board: 42,
      fields: ['id', 'name'],
    });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.createSprint).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Sprint 1', board: '42' })
    );
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.createSprint).mockRejectedValue(new Error('Invalid board'));
    const result = await tool.execute({ name: 'X', board: 'bad', fields: ['id'] });
    expect(result.isError).toBe(true);
  });
});
