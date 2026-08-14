/**
 * Unit тесты для GetPrioritiesTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetPrioritiesTool } from '#tools/api/administration/get-priorities.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';

function paginated<T>(items: T[]) {
  return {
    items,
    pagination: {
      hasNextPage: false,
      fetchedAll: true,
      truncated: false,
      hasError: false,
      pagesFetched: 1,
    },
  };
}

describe('GetPrioritiesTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetPrioritiesTool;

  beforeEach(() => {
    mockTrackerFacade = { getPriorities: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new GetPrioritiesTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации, если fields не указан', async () => {
    const result = await tool.execute({});
    expect(result.isError).toBe(true);
  });

  it('вернёт справочник приоритетов', async () => {
    const items = [{ id: '1', key: 'critical', display: 'Critical' }];
    vi.mocked(mockTrackerFacade.getPriorities).mockResolvedValue(paginated(items));

    const result = await tool.execute({ fields: ['id', 'key'] });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.getPriorities).toHaveBeenCalledWith();
    const parsed = JSON.parse(result.content[0]?.text || '{}') as { data: { count: number } };
    expect(parsed.data.count).toBe(1);
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.getPriorities).mockRejectedValue(new Error('Network error'));
    const result = await tool.execute({ fields: ['id'] });
    expect(result.isError).toBe(true);
  });
});
