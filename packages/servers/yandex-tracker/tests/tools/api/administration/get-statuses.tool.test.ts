/**
 * Unit тесты для GetStatusesTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetStatusesTool } from '#tools/api/administration/get-statuses.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import { getTextContent } from '#helpers/tool-result.helper.js';

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

describe('GetStatusesTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetStatusesTool;

  beforeEach(() => {
    mockTrackerFacade = { getStatuses: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new GetStatusesTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации, если fields не указан', async () => {
    const result = await tool.execute({});
    expect(result.isError).toBe(true);
  });

  it('вернёт справочник статусов', async () => {
    const items = [{ id: '1', key: 'open', display: 'Open' }];
    vi.mocked(mockTrackerFacade.getStatuses).mockResolvedValue(paginated(items));

    const result = await tool.execute({ fields: ['id', 'key'] });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.getStatuses).toHaveBeenCalledWith();
    const parsed = JSON.parse(getTextContent(result)) as { data: { count: number } };
    expect(parsed.data.count).toBe(1);
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.getStatuses).mockRejectedValue(new Error('Network error'));
    const result = await tool.execute({ fields: ['id'] });
    expect(result.isError).toBe(true);
  });
});
