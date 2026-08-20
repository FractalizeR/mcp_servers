/**
 * Unit тесты для GetIssueTypesTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetIssueTypesTool } from '#tools/api/administration/get-issue-types.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import { getTextContent } from '#helpers/tool-result.helper.js';
import type { IssueTypeWithUnknownFields } from '#tracker_api/entities/index.js';

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

describe('GetIssueTypesTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetIssueTypesTool;

  beforeEach(() => {
    mockTrackerFacade = { getIssueTypes: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new GetIssueTypesTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации, если fields не указан', async () => {
    const result = await tool.execute({});
    expect(result.isError).toBe(true);
  });

  it('вернёт справочник типов задач', async () => {
    const items = [{ id: '1', key: 'bug', display: 'Bug' }];
    vi.mocked(mockTrackerFacade.getIssueTypes).mockResolvedValue(paginated(items));

    const result = await tool.execute({ fields: ['id', 'key'] });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.getIssueTypes).toHaveBeenCalledWith();
    const parsed = JSON.parse(getTextContent(result)) as { data: { count: number } };
    expect(parsed.data.count).toBe(1);
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.getIssueTypes).mockRejectedValue(new Error('Network error'));
    const result = await tool.execute({ fields: ['id'] });
    expect(result.isError).toBe(true);
  });

  it('не выдаёт предупреждений, когда все запрошенные поля пришли', async () => {
    vi.mocked(mockTrackerFacade.getIssueTypes).mockResolvedValue(
      paginated([{ id: '1', key: 'bug', display: 'Bug' }])
    );

    const result = await tool.execute({ fields: ['id', 'key'] });

    const structured = (result as { structuredContent?: { warnings?: unknown[] } })
      .structuredContent;
    expect(structured?.warnings).toBeUndefined();
  });

  // Регрессионный тест ядра находки 1 отчёта: неверное имя поля → warning, не ошибка.
  it('предупреждает, когда запрошенное поле не вернуло значения ни у одного элемента', async () => {
    vi.mocked(mockTrackerFacade.getIssueTypes).mockResolvedValue(
      paginated([{ id: '1', key: 'bug', display: 'Bug' }])
    );

    const result = await tool.execute({ fields: ['id', 'totallyBogusField'] });

    expect(result.isError).toBeUndefined();
    const structured = (
      result as { structuredContent?: { warnings?: Array<{ code: string; details?: unknown }> } }
    ).structuredContent;
    expect(structured?.warnings).toEqual([
      expect.objectContaining({
        code: 'FIELDS_WITHOUT_VALUE',
        details: { fields: ['totallyBogusField'] },
      }),
    ]);
  });

  // Защита от шумного предупреждения: поле пустое лишь у части элементов — не повод предупреждать.
  it('не предупреждает, когда поле заполнено хотя бы у одного элемента', async () => {
    vi.mocked(mockTrackerFacade.getIssueTypes).mockResolvedValue(
      paginated<IssueTypeWithUnknownFields>([
        { id: '1', key: 'bug', display: 'Bug' },
        { id: '2', key: 'task' } as IssueTypeWithUnknownFields,
      ])
    );

    const result = await tool.execute({ fields: ['id', 'display'] });

    const structured = (result as { structuredContent?: { warnings?: unknown[] } })
      .structuredContent;
    expect(structured?.warnings).toBeUndefined();
  });
});
