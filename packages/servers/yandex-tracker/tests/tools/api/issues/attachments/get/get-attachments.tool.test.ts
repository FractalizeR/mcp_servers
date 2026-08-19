/**
 * Unit тесты для GetAttachmentsTool
 *
 * Фасад мокается. Эндпоинт НЕ пагинируется: проверяется регрессия формата
 * (ключи attachments/attachmentsCount) и ОТСУТСТВИЕ блока pagination в выходе.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetAttachmentsTool } from '#tools/api/issues/attachments/get/index.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import type { AttachmentWithUnknownFields } from '#tracker_api/entities/index.js';
import type { PaginatedResult, PaginationMeta } from '#tracker_api/entities/index.js';
import { createAttachmentListFixture } from '#helpers/attachment.fixture.js';
import { getTextContent, at } from '#helpers/tool-result.helper.js';

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
  });

  describe('Operation calls', () => {
    it('вызывает getAttachmentsMany только с issueIds (без пагинации)', async () => {
      vi.mocked(mockTrackerFacade.getAttachmentsMany).mockResolvedValue([
        { status: 'fulfilled', key: 'TEST-1', index: 0, value: paginated(mockAttachments) },
      ]);

      await tool.execute({ issueIds: ['TEST-1'], fields: ['id'] });

      expect(mockTrackerFacade.getAttachmentsMany).toHaveBeenCalledWith(['TEST-1']);
    });

    it('возвращает прежние ключи (attachments/attachmentsCount) и НЕ содержит pagination', async () => {
      vi.mocked(mockTrackerFacade.getAttachmentsMany).mockResolvedValue([
        { status: 'fulfilled', key: 'TEST-1', index: 0, value: paginated(mockAttachments) },
      ]);

      const result = await tool.execute({ issueIds: ['TEST-1'], fields: ['id', 'name'] });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(getTextContent(result)) as {
        success: boolean;
        data: {
          total: number;
          successful: Array<{
            issueId: string;
            attachments: AttachmentWithUnknownFields[];
            attachmentsCount: number;
          }>;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.total).toBe(1);
      expect(at(parsed.data.successful).issueId).toBe('TEST-1');
      expect(at(parsed.data.successful).attachmentsCount).toBe(2);
      expect(at(parsed.data.successful).attachments).toHaveLength(2);
      expect(parsed.data.successful[0]).not.toHaveProperty('pagination');
    });

    it('фильтрует поля в файлах', async () => {
      vi.mocked(mockTrackerFacade.getAttachmentsMany).mockResolvedValue([
        { status: 'fulfilled', key: 'TEST-1', index: 0, value: paginated(mockAttachments) },
      ]);

      const result = await tool.execute({ issueIds: ['TEST-1'], fields: ['id'] });

      const parsed = JSON.parse(getTextContent(result)) as {
        data: { successful: Array<{ attachments: Array<Record<string, unknown>> }> };
      };
      expect(at(parsed.data.successful).attachments[0]).toHaveProperty('id');
      expect(at(parsed.data.successful).attachments[0]).not.toHaveProperty('size');
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
