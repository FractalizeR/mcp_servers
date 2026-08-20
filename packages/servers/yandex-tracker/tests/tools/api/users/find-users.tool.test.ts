/**
 * Unit тесты для FindUsersTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FindUsersTool } from '#tools/api/users/find-users.tool.js';
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

describe('FindUsersTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: FindUsersTool;

  beforeEach(() => {
    mockTrackerFacade = { findUsers: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new FindUsersTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации, если fields не указан', async () => {
    const result = await tool.execute({});
    expect(result.isError).toBe(true);
  });

  it('вернёт список пользователей', async () => {
    const users = [{ uid: 1, display: 'Ivan Ivanov', login: 'ivanov' }];
    vi.mocked(mockTrackerFacade.findUsers).mockResolvedValue(paginated(users));

    const result = await tool.execute({ fields: ['uid', 'login'] });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.findUsers).toHaveBeenCalledWith(
      expect.objectContaining({ perPage: undefined })
    );
    const parsed = JSON.parse(getTextContent(result)) as { data: { count: number } };
    expect(parsed.data.count).toBe(1);
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.findUsers).mockRejectedValue(new Error('Network error'));
    const result = await tool.execute({ fields: ['uid'] });
    expect(result.isError).toBe(true);
  });

  it('предупреждает, когда поле не вернуло значения ни у одного пользователя', async () => {
    const users = [{ uid: 1, display: 'Ivan Ivanov', login: 'ivanov' }];
    vi.mocked(mockTrackerFacade.findUsers).mockResolvedValue(paginated(users));

    const result = await tool.execute({ fields: ['uid', 'totallyBogusField'] });

    expect(result.isError).toBeUndefined();
    const structured = (result as { structuredContent?: { warnings?: Array<{ code: string }> } })
      .structuredContent;
    expect(structured?.warnings).toEqual([
      expect.objectContaining({ code: 'FIELDS_WITHOUT_VALUE' }),
    ]);
  });

  it('не выдаёт предупреждений на пустой коллекции', async () => {
    vi.mocked(mockTrackerFacade.findUsers).mockResolvedValue(paginated([]));

    const result = await tool.execute({ fields: ['uid'] });

    const structured = (result as { structuredContent?: { warnings?: unknown[] } })
      .structuredContent;
    expect(structured?.warnings).toBeUndefined();
  });
});
