/**
 * Unit тесты для GetEntityTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetEntityTool } from '#tools/api/entities/get-entity.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';

describe('GetEntityTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetEntityTool;

  beforeEach(() => {
    mockTrackerFacade = { getEntity: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new GetEntityTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации при пустом entityId', async () => {
    const result = await tool.execute({ entityType: 'goal', entityId: '', fields: ['id'] });
    expect(result.isError).toBe(true);
  });

  it('вернёт запись Entity API', async () => {
    const entity = { id: '1', self: 'url', version: 1, shortId: 'G-1', entityType: 'goal' };
    vi.mocked(mockTrackerFacade.getEntity).mockResolvedValue(entity);

    const result = await tool.execute({ entityType: 'goal', entityId: '1', fields: ['id'] });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.getEntity).toHaveBeenCalledWith({ entityType: 'goal', entityId: '1' });
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.getEntity).mockRejectedValue(new Error('Not found'));
    const result = await tool.execute({ entityType: 'goal', entityId: '999', fields: ['id'] });
    expect(result.isError).toBe(true);
  });
});
