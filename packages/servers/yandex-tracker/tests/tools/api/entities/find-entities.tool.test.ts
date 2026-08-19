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
});
