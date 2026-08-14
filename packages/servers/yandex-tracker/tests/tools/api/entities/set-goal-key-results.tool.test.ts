/**
 * Unit тесты для SetGoalKeyResultsTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SetGoalKeyResultsTool } from '#tools/api/entities/set-goal-key-results.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';

describe('SetGoalKeyResultsTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: SetGoalKeyResultsTool;

  beforeEach(() => {
    mockTrackerFacade = { setGoalKeyResults: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new SetGoalKeyResultsTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации, если items пуст', async () => {
    const result = await tool.execute({ goalId: 'g1', items: [] });
    expect(result.isError).toBe(true);
  });

  it('заменит список key results', async () => {
    const items = [{ id: 'kr1', type: 'value', text: 'Grow MRR' }];
    vi.mocked(mockTrackerFacade.setGoalKeyResults).mockResolvedValue(items);

    const result = await tool.execute({
      goalId: 'g1',
      items: [{ type: 'value', text: 'Grow MRR', progress: { start: 0, end: 100 } }],
    });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.setGoalKeyResults).toHaveBeenCalledWith({
      goalId: 'g1',
      items: [{ type: 'value', text: 'Grow MRR', progress: { start: 0, end: 100 } }],
    });
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.setGoalKeyResults).mockRejectedValue(new Error('Not found'));
    const result = await tool.execute({
      goalId: 'g1',
      items: [{ type: 'binary', text: 'X' }],
    });
    expect(result.isError).toBe(true);
  });
});
