/**
 * Unit тесты для UpdateSprintTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UpdateSprintTool } from '#tools/api/sprints/update-sprint.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';

describe('UpdateSprintTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: UpdateSprintTool;

  beforeEach(() => {
    mockTrackerFacade = { updateSprint: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new UpdateSprintTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации при пустом sprintId', async () => {
    const result = await tool.execute({ sprintId: '', fields: ['id'] });
    expect(result.isError).toBe(true);
  });

  it('обновит спринт', async () => {
    const sprint = { id: '1', self: 'url', version: 2, name: 'Renamed' };
    vi.mocked(mockTrackerFacade.updateSprint).mockResolvedValue(sprint);

    const result = await tool.execute({
      sprintId: '1',
      name: 'Renamed',
      fields: ['id', 'name'],
    });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.updateSprint).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({ name: 'Renamed' })
    );
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.updateSprint).mockRejectedValue(new Error('Not found'));
    const result = await tool.execute({ sprintId: '999', fields: ['id'] });
    expect(result.isError).toBe(true);
  });
});
