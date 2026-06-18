/**
 * Unit тесты для GetAttachmentsTool (с пагинацией)
 *
 * Фасад мокается; проверяется регрессия формата (ключи attachments/
 * attachmentsCount) и добавление поля pagination.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetAttachmentsTool } from '#tools/api/issues/attachments/get/index.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import type { AttachmentWithUnknownFields } from '#tracker_api/entities/index.js';
import type { PaginatedResult, PaginationMeta } from '#tracker_api/entities/index.js';
import { createAttachmentListFixture } from '#helpers/attachment.fixture.js';

/** Метаданные пагинации по умолчанию (одна страница, всё получено). */
const META: PaginationMeta = {
  hasNextPage: false,
  fetchedAll: true,
  truncated: false,
  hasError: false,
  pagesFetched: 1,
};

/** Обернуть массив в PaginatedResult. */
function paginated(
  items: AttachmentWithUnknownFields[]
): PaginatedResult<AttachmentWithUnknownFields> {
  return { items, pagination: META };
}

describe('GetAttachmentsTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetAttachmentsTool;

  const mockAttachments = createAttachmentListFixture(2);

  beforeEach(() => {
    mockTrackerFacade = {
      getAttachmentsMany: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new GetAttachmentsTool(mockTrackerFacade, mockLogger);
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
      vi.mocked(mockTrackerFacade.getAttachmentsMany).mockResolvedValue([
        { status: 'fulfilled', key: 'TEST-1', index: 0, value: paginated(mockAttachments) },
      ]);

      await tool.execute({
        issueIds: ['TEST-1'],
        fields: ['id'],
        fetchAll: true,
        maxItems: 10,
      });

      expect(mockTrackerFacade.getAttachmentsMany).toHaveBeenCalledWith(
        ['TEST-1'],
        expect.objectContaining({ fetchAll: true, maxItems: 10 })
      );
    });

    it('возвращает прежние ключи (attachments/attachmentsCount) + pagination', async () => {
      vi.mocked(mockTrackerFacade.getAttachmentsMany).mockResolvedValue([
        { status: 'fulfilled', key: 'TEST-1', index: 0, value: paginated(mockAttachments) },
      ]);

      const result = await tool.execute({ issueIds: ['TEST-1'], fields: ['id', 'name'] });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          total: number;
          successful: Array<{
            issueId: string;
            attachments: AttachmentWithUnknownFields[];
            attachmentsCount: number;
            pagination: PaginationMeta;
          }>;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.total).toBe(1);
      expect(parsed.data.successful[0].issueId).toBe('TEST-1');
      expect(parsed.data.successful[0].attachmentsCount).toBe(2);
      expect(parsed.data.successful[0].attachments).toHaveLength(2);
      expect(parsed.data.successful[0].pagination).toMatchObject({
        hasNextPage: false,
        fetchedAll: true,
      });
    });

    it('фильтрует поля в файлах', async () => {
      vi.mocked(mockTrackerFacade.getAttachmentsMany).mockResolvedValue([
        { status: 'fulfilled', key: 'TEST-1', index: 0, value: paginated(mockAttachments) },
      ]);

      const result = await tool.execute({ issueIds: ['TEST-1'], fields: ['id'] });

      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        data: { successful: Array<{ attachments: Array<Record<string, unknown>> }> };
      };
      expect(parsed.data.successful[0].attachments[0]).toHaveProperty('id');
      expect(parsed.data.successful[0].attachments[0]).not.toHaveProperty('size');
    });
  });

  describe('Error handling', () => {
    it('обрабатывает ошибки фасада', async () => {
      vi.mocked(mockTrackerFacade.getAttachmentsMany).mockRejectedValue(new Error('API Error'));

      const result = await tool.execute({ issueIds: ['TEST-1'], fields: ['id'] });

      expect(result.isError).toBe(true);
    });
  });
});
