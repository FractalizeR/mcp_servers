/**
 * Unit тесты для GetFiltersTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetFiltersTool } from '#tools/api/filters/get-filters.tool.js';
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

describe('GetFiltersTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetFiltersTool;

  beforeEach(() => {
    mockTrackerFacade = { getFilters: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new GetFiltersTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации, если fields не указан', async () => {
    const result = await tool.execute({});
    expect(result.isError).toBe(true);
  });

  it('вернёт список фильтров', async () => {
    const filters = [{ id: '1', self: 'url', name: 'Open bugs' }];
    vi.mocked(mockTrackerFacade.getFilters).mockResolvedValue(paginated(filters));

    const result = await tool.execute({ fields: ['id', 'name'] });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.getFilters).toHaveBeenCalledWith();
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.getFilters).mockRejectedValue(new Error('Network error'));
    const result = await tool.execute({ fields: ['id'] });
    expect(result.isError).toBe(true);
  });

  describe('Предупреждения о полях без значения (FIELDS_WITHOUT_VALUE)', () => {
    it('добавляет warning, когда поле не пришло ни у одного фильтра', async () => {
      const filters = [{ id: '1', self: 'url', name: 'Open bugs' }]; // без query
      vi.mocked(mockTrackerFacade.getFilters).mockResolvedValue(paginated(filters));

      const result = await tool.execute({ fields: ['id', 'query'] });

      const parsed = result['structuredContent'] as {
        success: boolean;
        warnings?: Array<{ code: string; details?: { fields: string[] } }>;
      };
      expect(parsed.success).toBe(true);
      expect(parsed.warnings).toHaveLength(1);
      expect(parsed.warnings?.[0]?.code).toBe('FIELDS_WITHOUT_VALUE');
      expect(parsed.warnings?.[0]?.details?.fields).toEqual(['query']);
    });

    it('НЕ предупреждает, если поле пришло хотя бы у одного фильтра из коллекции', async () => {
      const filters = [
        { id: '1', self: 'url', name: 'Open bugs' }, // без query
        { id: '2', self: 'url', name: 'My filter', query: 'assignee: me()' },
      ];
      vi.mocked(mockTrackerFacade.getFilters).mockResolvedValue(paginated(filters));

      const result = await tool.execute({ fields: ['id', 'query'] });

      const parsed = result['structuredContent'] as { success: boolean; warnings?: unknown[] };
      expect(parsed.success).toBe(true);
      expect(parsed.warnings).toBeUndefined();
    });

    it('ответ без предупреждений не содержит ключа warnings (обе проекции)', async () => {
      const filters = [{ id: '1', self: 'url', name: 'Open bugs' }];
      vi.mocked(mockTrackerFacade.getFilters).mockResolvedValue(paginated(filters));

      const result = await tool.execute({ fields: ['id', 'name'] });

      const textBlock = (result.content?.[0] as { text?: string } | undefined)?.text ?? '';
      expect(textBlock.includes('"warnings"')).toBe(false);
      expect(
        result['structuredContent'] && 'warnings' in (result['structuredContent'] as object)
      ).toBe(false);
    });
  });
});
