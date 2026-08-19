/**
 * Unit тесты для SearchWorklogTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchWorklogTool } from '#tools/api/worklog/search/search-worklog.tool.js';
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

describe('SearchWorklogTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: SearchWorklogTool;

  beforeEach(() => {
    mockTrackerFacade = { searchWorklog: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new SearchWorklogTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации, если fields не указан', async () => {
    const result = await tool.execute({ createdBy: 'ivanov' });
    expect(result.isError).toBe(true);
  });

  it('вернёт ошибку валидации при одновременных cursor и perPage', async () => {
    const result = await tool.execute({ cursor: 'c1:xxx', perPage: 50, fields: ['id'] });
    expect(result.isError).toBe(true);
  });

  it('найдёт worklog по автору и диапазону дат', async () => {
    const worklog = [{ id: '1', self: 'url', version: 1, duration: 'PT1H' }];
    vi.mocked(mockTrackerFacade.searchWorklog).mockResolvedValue(paginated(worklog));

    const result = await tool.execute({
      createdBy: 'ivanov',
      createdAtFrom: '2026-08-01T00:00:00.000+0000',
      createdAtTo: '2026-08-14T00:00:00.000+0000',
      fields: ['id', 'duration'],
    });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.searchWorklog).toHaveBeenCalledWith(
      expect.objectContaining({
        createdBy: 'ivanov',
        createdAtFrom: '2026-08-01T00:00:00.000+0000',
        createdAtTo: '2026-08-14T00:00:00.000+0000',
      })
    );
    const parsed = JSON.parse(getTextContent(result)) as { data: { count: number } };
    expect(parsed.data.count).toBe(1);
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.searchWorklog).mockRejectedValue(new Error('Network error'));
    const result = await tool.execute({ fields: ['id'] });
    expect(result.isError).toBe(true);
  });
});
