/**
 * Unit тесты для GetGoalKeyResultsTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetGoalKeyResultsTool } from '#tools/api/entities/get-goal-key-results.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import { getTextContent } from '#helpers/tool-result.helper.js';

describe('GetGoalKeyResultsTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetGoalKeyResultsTool;

  beforeEach(() => {
    mockTrackerFacade = { getGoalKeyResults: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new GetGoalKeyResultsTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации при пустом goalId', async () => {
    const result = await tool.execute({ goalId: '', fields: ['id'] });
    expect(result.isError).toBe(true);
  });

  it('вернёт key results цели', async () => {
    const items = [{ id: 'kr1', type: 'binary', text: 'Ship feature X' }];
    vi.mocked(mockTrackerFacade.getGoalKeyResults).mockResolvedValue(items);

    const result = await tool.execute({ goalId: 'g1', fields: ['id', 'text'] });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.getGoalKeyResults).toHaveBeenCalledWith({ goalId: 'g1' });
    const parsed = JSON.parse(getTextContent(result)) as { data: { count: number } };
    expect(parsed.data.count).toBe(1);
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.getGoalKeyResults).mockRejectedValue(new Error('Not found'));
    const result = await tool.execute({ goalId: 'g1', fields: ['id'] });
    expect(result.isError).toBe(true);
  });
});
