/**
 * Unit тесты для GetSprintsTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetSprintsTool } from '#tools/api/sprints/get-sprints.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';

describe('GetSprintsTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetSprintsTool;

  beforeEach(() => {
    mockTrackerFacade = { getSprints: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new GetSprintsTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации при пустом boardId', async () => {
    const result = await tool.execute({ boardId: '', fields: ['id'] });
    expect(result.isError).toBe(true);
  });

  it('вернёт список спринтов доски', async () => {
    const sprints = [{ id: '1', self: 'url', version: 1, name: 'Sprint 1' }];
    vi.mocked(mockTrackerFacade.getSprints).mockResolvedValue(sprints);

    const result = await tool.execute({ boardId: 'b1', fields: ['id', 'name'] });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.getSprints).toHaveBeenCalledWith('b1');
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.getSprints).mockRejectedValue(new Error('Not found'));
    const result = await tool.execute({ boardId: 'b1', fields: ['id'] });
    expect(result.isError).toBe(true);
  });
});
