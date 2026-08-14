/**
 * Unit тесты для ClearGoalKeyResultsTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClearGoalKeyResultsTool } from '#tools/api/entities/clear-goal-key-results.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';

describe('ClearGoalKeyResultsTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: ClearGoalKeyResultsTool;

  beforeEach(() => {
    mockTrackerFacade = { clearGoalKeyResults: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new ClearGoalKeyResultsTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации при пустом goalId', async () => {
    const result = await tool.execute({ goalId: '' });
    expect(result.isError).toBe(true);
  });

  it('очистит key results', async () => {
    vi.mocked(mockTrackerFacade.clearGoalKeyResults).mockResolvedValue(undefined);

    const result = await tool.execute({ goalId: 'g1' });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.clearGoalKeyResults).toHaveBeenCalledWith({ goalId: 'g1' });
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.clearGoalKeyResults).mockRejectedValue(new Error('Not found'));
    const result = await tool.execute({ goalId: 'g1' });
    expect(result.isError).toBe(true);
  });
});
