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
import { getTextContent, itemAt } from '#helpers/tool-result.helper.js';

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

    it('отклоняет конфликт cursor + bulk-параметров (fetchAll)', async () => {
      const result = await tool.execute({
        issueIds: ['TEST-1'],
        fields: ['id'],
        cursor: 'c1:abc',
        fetchAll: true,
      });
      expect(result.isError).toBe(true);
    });

    it('отклоняет cursor при нескольких issueIds', async () => {
      const result = await tool.execute({
        issueIds: ['TEST-1', 'TEST-2'],
        fields: ['id'],
        cursor: 'c1:abc',
      });
      expect(result.isError).toBe(true);
    });

    it('прокидывает cursor в фасад', async () => {
      vi.mocked(mockTrackerFacade.getWorklogsMany).mockResolvedValue([
        { status: 'fulfilled', key: 'TEST-1', index: 0, value: paginated(mockWorklogs) },
      ]);

      await tool.execute({ issueIds: ['TEST-1'], fields: ['id'], cursor: 'c1:abc' });

      expect(mockTrackerFacade.getWorklogsMany).toHaveBeenCalledWith(
        ['TEST-1'],
        expect.objectContaining({ cursor: 'c1:abc' })
      );
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
      const parsed = JSON.parse(getTextContent(result)) as {
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
      expect(itemAt(parsed.data.worklogs).issueId).toBe('TEST-1');
      expect(itemAt(parsed.data.worklogs).count).toBe(2);
      expect(itemAt(parsed.data.worklogs).worklogs).toHaveLength(2);
      expect(itemAt(parsed.data.worklogs).pagination).toMatchObject({
        hasNextPage: false,
        fetchedAll: true,
      });
    });

    it('фильтрует поля в записях', async () => {
      vi.mocked(mockTrackerFacade.getWorklogsMany).mockResolvedValue([
        { status: 'fulfilled', key: 'TEST-1', index: 0, value: paginated(mockWorklogs) },
      ]);

      const result = await tool.execute({ issueIds: ['TEST-1'], fields: ['id'] });

      const parsed = JSON.parse(getTextContent(result)) as {
        data: { worklogs: Array<{ worklogs: Array<Record<string, unknown>> }> };
      };
      expect(itemAt(parsed.data.worklogs).worklogs[0]).toHaveProperty('id');
      expect(itemAt(parsed.data.worklogs).worklogs[0]).not.toHaveProperty('duration');
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
