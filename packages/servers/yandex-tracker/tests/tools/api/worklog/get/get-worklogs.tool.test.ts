/**
 * Unit тесты для GetWorklogsTool (с пагинацией)
 *
 * Фасад мокается; проверяется регрессия формата (ключи worklogs/count)
 * и добавление поля pagination.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetWorklogsTool } from '#tools/api/worklog/get/index.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import type { WorklogWithUnknownFields } from '#tracker_api/entities/index.js';
import type { PaginatedResult, PaginationMeta } from '#tracker_api/entities/index.js';

/** Метаданные пагинации по умолчанию (одна страница, всё получено). */
const META: PaginationMeta = {
  hasNextPage: false,
  fetchedAll: true,
  truncated: false,
  hasError: false,
  pagesFetched: 1,
};

/** Фабрика записи времени. */
function makeWorklog(id: string): WorklogWithUnknownFields {
  return {
    id,
    self: `https://api.tracker.yandex.net/v2/issues/TEST-1/worklog/${id}`,
    issue: { id: 'abc', key: 'TEST-1', display: 'Test' },
    createdBy: { self: 'u', id: '1', display: 'User 1' },
    createdAt: '2025-01-18T10:00:00.000+0000',
    start: '2025-01-18T09:00:00.000+0000',
    duration: 'PT1H',
  } as WorklogWithUnknownFields;
}

/** Обернуть массив в PaginatedResult. */
function paginated(items: WorklogWithUnknownFields[]): PaginatedResult<WorklogWithUnknownFields> {
  return { items, pagination: META };
}

describe('GetWorklogsTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetWorklogsTool;

  const mockWorklogs = [makeWorklog('1'), makeWorklog('2')];

  beforeEach(() => {
    mockTrackerFacade = {
      getWorklogsMany: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new GetWorklogsTool(mockTrackerFacade, mockLogger);
  });

  describe('Validation', () => {
    it('требует issueIds', async () => {
      const result = await tool.execute({ fields: ['id'] });
      expect(result.isError).toBe(true);
    });

    it('требует fields', async () => {
      const result = await tool.execute({ issueIds: ['TEST-1'] });
      expect(result.isError).toBe(true);
    });

    it('отклоняет конфликт page + fetchAll', async () => {
      const result = await tool.execute({
        issueIds: ['TEST-1'],
        fields: ['id'],
        page: 2,
        fetchAll: true,
      });
      expect(result.isError).toBe(true);
    });
  });

  describe('Operation calls', () => {
    it('передаёт параметры пагинации в фасад', async () => {
      vi.mocked(mockTrackerFacade.getWorklogsMany).mockResolvedValue([
        { status: 'fulfilled', key: 'TEST-1', index: 0, value: paginated(mockWorklogs) },
      ]);

      await tool.execute({
        issueIds: ['TEST-1'],
        fields: ['id'],
        fetchAll: true,
        maxItems: 10,
      });

      expect(mockTrackerFacade.getWorklogsMany).toHaveBeenCalledWith(
        ['TEST-1'],
        expect.objectContaining({ fetchAll: true, maxItems: 10 })
      );
    });

    it('возвращает прежние ключи (worklogs/count) + pagination', async () => {
      vi.mocked(mockTrackerFacade.getWorklogsMany).mockResolvedValue([
        { status: 'fulfilled', key: 'TEST-1', index: 0, value: paginated(mockWorklogs) },
      ]);

      const result = await tool.execute({ issueIds: ['TEST-1'], fields: ['id'] });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          total: number;
          worklogs: Array<{
            issueId: string;
            worklogs: WorklogWithUnknownFields[];
            count: number;
            pagination: PaginationMeta;
          }>;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.total).toBe(1);
      expect(parsed.data.worklogs[0].issueId).toBe('TEST-1');
      expect(parsed.data.worklogs[0].count).toBe(2);
      expect(parsed.data.worklogs[0].worklogs).toHaveLength(2);
      expect(parsed.data.worklogs[0].pagination).toMatchObject({
        hasNextPage: false,
        fetchedAll: true,
      });
    });

    it('фильтрует поля в записях', async () => {
      vi.mocked(mockTrackerFacade.getWorklogsMany).mockResolvedValue([
        { status: 'fulfilled', key: 'TEST-1', index: 0, value: paginated(mockWorklogs) },
      ]);

      const result = await tool.execute({ issueIds: ['TEST-1'], fields: ['id'] });

      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        data: { worklogs: Array<{ worklogs: Array<Record<string, unknown>> }> };
      };
      expect(parsed.data.worklogs[0].worklogs[0]).toHaveProperty('id');
      expect(parsed.data.worklogs[0].worklogs[0]).not.toHaveProperty('duration');
    });
  });

  describe('Error handling', () => {
    it('обрабатывает ошибки фасада', async () => {
      vi.mocked(mockTrackerFacade.getWorklogsMany).mockRejectedValue(new Error('API Error'));

      const result = await tool.execute({ issueIds: ['TEST-1'], fields: ['id'] });

      expect(result.isError).toBe(true);
    });
  });
});
