/**
 * Unit тесты для FindEntitiesTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FindEntitiesTool } from '#tools/api/entities/find-entities.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import { getTextContent } from '#helpers/tool-result.helper.js';
import { createEntityApiRecordFixture } from '#helpers/entity-api.fixture.js';

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

describe('FindEntitiesTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: FindEntitiesTool;

  beforeEach(() => {
    mockTrackerFacade = { findEntities: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new FindEntitiesTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации при неизвестном entityType', async () => {
    const result = await tool.execute({ entityType: 'epic', fields: ['id'] });
    expect(result.isError).toBe(true);
  });

  it('найдёт записи по entityType=goal', async () => {
    const entities = [createEntityApiRecordFixture()];
    vi.mocked(mockTrackerFacade.findEntities).mockResolvedValue(paginated(entities));

    const result = await tool.execute({ entityType: 'goal', fields: ['id', 'shortId'] });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.findEntities).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'goal' })
    );
    const parsed = JSON.parse(getTextContent(result)) as {
      data: { entityType: string; count: number };
    };
    expect(parsed.data.entityType).toBe('goal');
    expect(parsed.data.count).toBe(1);
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.findEntities).mockRejectedValue(new Error('Network error'));
    const result = await tool.execute({ entityType: 'project', fields: ['id'] });
    expect(result.isError).toBe(true);
  });

  describe('Предупреждения о полях без значения (FIELDS_WITHOUT_VALUE)', () => {
    it('добавляет warning, когда поле не пришло ни у одной записи', async () => {
      const entities = [createEntityApiRecordFixture(), createEntityApiRecordFixture({ id: '2' })];
      vi.mocked(mockTrackerFacade.findEntities).mockResolvedValue(paginated(entities));

      const result = await tool.execute({ entityType: 'goal', fields: ['id', 'bogusField'] });

      const parsed = JSON.parse(getTextContent(result)) as {
        success: boolean;
        warnings?: Array<{ code: string; details?: { fields: string[] } }>;
      };
      expect(parsed.success).toBe(true);
      expect(parsed.warnings).toHaveLength(1);
      expect(parsed.warnings?.[0]?.code).toBe('FIELDS_WITHOUT_VALUE');
      expect(parsed.warnings?.[0]?.details?.fields).toEqual(['bogusField']);
    });

    it('НЕ предупреждает, если поле пришло лишь у части записей', async () => {
      const entities = [
        createEntityApiRecordFixture({ id: '1' }),
        createEntityApiRecordFixture({ id: '2', closedAt: '2024-02-01T00:00:00.000+0000' }),
      ];
      vi.mocked(mockTrackerFacade.findEntities).mockResolvedValue(paginated(entities));

      const result = await tool.execute({ entityType: 'goal', fields: ['id', 'closedAt'] });

      const parsed = JSON.parse(getTextContent(result)) as { warnings?: unknown[] };
      expect(parsed.warnings).toBeUndefined();
    });

    it('ответ без предупреждений не содержит ключа warnings ни в одной из проекций', async () => {
      const entities = [createEntityApiRecordFixture()];
      vi.mocked(mockTrackerFacade.findEntities).mockResolvedValue(paginated(entities));

      const result = await tool.execute({ entityType: 'goal', fields: ['id'] });

      const parsed = JSON.parse(getTextContent(result)) as Record<string, unknown>;
      expect('warnings' in parsed).toBe(false);
      expect(
        result['structuredContent'] && 'warnings' in (result['structuredContent'] as object)
      ).toBe(false);
    });
  });
});
