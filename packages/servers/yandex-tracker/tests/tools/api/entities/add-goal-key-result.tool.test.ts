/**
 * Unit тесты для AddGoalKeyResultTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AddGoalKeyResultTool } from '#tools/api/entities/add-goal-key-result.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';

describe('AddGoalKeyResultTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: AddGoalKeyResultTool;

  beforeEach(() => {
    mockTrackerFacade = { addGoalKeyResult: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new AddGoalKeyResultTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации, если text не указан', async () => {
    const result = await tool.execute({ goalId: 'g1', item: { type: 'binary' } });
    expect(result.isError).toBe(true);
  });

  it('добавит key result', async () => {
    const items = [{ id: 'kr1', type: 'binary', text: 'Ship X' }];
    vi.mocked(mockTrackerFacade.addGoalKeyResult).mockResolvedValue(items);

    const result = await tool.execute({
      goalId: 'g1',
      item: { type: 'binary', text: 'Ship X' },
    });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.addGoalKeyResult).toHaveBeenCalledWith({
      goalId: 'g1',
      item: { type: 'binary', text: 'Ship X' },
    });
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.addGoalKeyResult).mockRejectedValue(new Error('Not found'));
    const result = await tool.execute({ goalId: 'g1', item: { type: 'binary', text: 'X' } });
    expect(result.isError).toBe(true);
  });
});
