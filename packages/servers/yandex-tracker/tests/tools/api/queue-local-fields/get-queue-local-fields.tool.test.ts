/**
 * Unit тесты для GetQueueLocalFieldsTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetQueueLocalFieldsTool } from '#tools/api/queue-local-fields/get-queue-local-fields.tool.js';
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

describe('GetQueueLocalFieldsTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetQueueLocalFieldsTool;

  beforeEach(() => {
    mockTrackerFacade = { getQueueLocalFields: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new GetQueueLocalFieldsTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации при пустом queueId', async () => {
    const result = await tool.execute({ queueId: '', fields: ['id'] });
    expect(result.isError).toBe(true);
  });

  it('вернёт список локальных полей', async () => {
    const fields = [{ id: 'x--myField', self: 'url', key: 'myField', name: 'My Field' }];
    vi.mocked(mockTrackerFacade.getQueueLocalFields).mockResolvedValue(paginated(fields));

    const result = await tool.execute({ queueId: 'Q1', fields: ['id', 'key'] });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.getQueueLocalFields).toHaveBeenCalledWith({ queueId: 'Q1' });
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.getQueueLocalFields).mockRejectedValue(new Error('Not found'));
    const result = await tool.execute({ queueId: 'Q1', fields: ['id'] });
    expect(result.isError).toBe(true);
  });

  describe('Предупреждения о полях без значения (FIELDS_WITHOUT_VALUE)', () => {
    it('добавляет warning, когда поле не пришло ни у одного локального поля', async () => {
      const fields = [{ id: 'x--myField', self: 'url', key: 'myField', name: 'My Field' }]; // без description
      vi.mocked(mockTrackerFacade.getQueueLocalFields).mockResolvedValue(paginated(fields));

      const result = await tool.execute({ queueId: 'Q1', fields: ['key', 'description'] });

      const parsed = result['structuredContent'] as {
        success: boolean;
        warnings?: Array<{ code: string; details?: { fields: string[] } }>;
      };
      expect(parsed.success).toBe(true);
      expect(parsed.warnings).toHaveLength(1);
      expect(parsed.warnings?.[0]?.code).toBe('FIELDS_WITHOUT_VALUE');
      expect(parsed.warnings?.[0]?.details?.fields).toEqual(['description']);
    });

    it('ответ без предупреждений не содержит ключа warnings (обе проекции)', async () => {
      const fields = [{ id: 'x--myField', self: 'url', key: 'myField', name: 'My Field' }];
      vi.mocked(mockTrackerFacade.getQueueLocalFields).mockResolvedValue(paginated(fields));

      const result = await tool.execute({ queueId: 'Q1', fields: ['key', 'name'] });

      const textBlock = (result.content?.[0] as { text?: string } | undefined)?.text ?? '';
      expect(textBlock.includes('"warnings"')).toBe(false);
      expect(
        result['structuredContent'] && 'warnings' in (result['structuredContent'] as object)
      ).toBe(false);
    });
  });
});
