/**
 * Unit тесты для UpdateEntityTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UpdateEntityTool } from '#tools/api/entities/update-entity.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';

describe('UpdateEntityTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: UpdateEntityTool;

  beforeEach(() => {
    mockTrackerFacade = { updateEntity: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new UpdateEntityTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации при пустом entityId', async () => {
    const result = await tool.execute({ entityType: 'goal', entityId: '', fields: ['id'] });
    expect(result.isError).toBe(true);
  });

  it('обновит запись', async () => {
    const entity = { id: '1', self: 'url', version: 2, shortId: 'G-1', entityType: 'goal' };
    vi.mocked(mockTrackerFacade.updateEntity).mockResolvedValue(entity);

    const result = await tool.execute({
      entityType: 'goal',
      entityId: '1',
      name: 'Renamed goal',
      fields: ['id'],
    });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.updateEntity).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'goal', entityId: '1', name: 'Renamed goal' })
    );
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.updateEntity).mockRejectedValue(new Error('Version conflict'));
    const result = await tool.execute({ entityType: 'goal', entityId: '1', fields: ['id'] });
    expect(result.isError).toBe(true);
  });
});
