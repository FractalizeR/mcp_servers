/**
 * Unit тесты для CreateEntityTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateEntityTool } from '#tools/api/entities/create-entity.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';

describe('CreateEntityTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: CreateEntityTool;

  beforeEach(() => {
    mockTrackerFacade = { createEntity: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new CreateEntityTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации, если name не указан', async () => {
    const result = await tool.execute({ entityType: 'goal', fields: ['id'] });
    expect(result.isError).toBe(true);
  });

  it('создаст цель с дополнительными полями (extraFields)', async () => {
    const entity = { id: '1', self: 'url', version: 1, shortId: 'G-1', entityType: 'goal' };
    vi.mocked(mockTrackerFacade.createEntity).mockResolvedValue(entity);

    const result = await tool.execute({
      entityType: 'goal',
      name: 'Increase revenue',
      extraFields: { author: 'user1' },
      fields: ['id'],
    });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.createEntity).toHaveBeenCalledWith({
      entityType: 'goal',
      name: 'Increase revenue',
      description: undefined,
      extraFields: { author: 'user1' },
    });
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.createEntity).mockRejectedValue(new Error('Permission denied'));
    const result = await tool.execute({ entityType: 'goal', name: 'X', fields: ['id'] });
    expect(result.isError).toBe(true);
  });
});
