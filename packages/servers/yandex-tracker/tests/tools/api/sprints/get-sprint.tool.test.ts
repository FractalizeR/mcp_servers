/**
 * Unit тесты для GetSprintTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetSprintTool } from '#tools/api/sprints/get-sprint.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';

describe('GetSprintTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetSprintTool;

  beforeEach(() => {
    mockTrackerFacade = { getSprint: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new GetSprintTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации при пустом sprintId', async () => {
    const result = await tool.execute({ sprintId: '', fields: ['id'] });
    expect(result.isError).toBe(true);
  });

  it('вернёт спринт', async () => {
    const sprint = { id: '1', self: 'url', version: 1, name: 'Sprint 1' };
    vi.mocked(mockTrackerFacade.getSprint).mockResolvedValue(sprint);

    const result = await tool.execute({ sprintId: '1', fields: ['id', 'name'] });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.getSprint).toHaveBeenCalledWith('1');
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.getSprint).mockRejectedValue(new Error('Not found'));
    const result = await tool.execute({ sprintId: '999', fields: ['id'] });
    expect(result.isError).toBe(true);
  });
});
