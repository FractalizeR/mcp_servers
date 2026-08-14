/**
 * Unit тесты для DeleteEntityTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeleteEntityTool } from '#tools/api/entities/delete-entity.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';

describe('DeleteEntityTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: DeleteEntityTool;

  beforeEach(() => {
    mockTrackerFacade = { deleteEntity: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new DeleteEntityTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации при пустом entityId', async () => {
    const result = await tool.execute({ entityType: 'goal', entityId: '' });
    expect(result.isError).toBe(true);
  });

  it('удалит запись', async () => {
    vi.mocked(mockTrackerFacade.deleteEntity).mockResolvedValue(undefined);

    const result = await tool.execute({ entityType: 'portfolio', entityId: '1' });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.deleteEntity).toHaveBeenCalledWith({
      entityType: 'portfolio',
      entityId: '1',
    });
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.deleteEntity).mockRejectedValue(new Error('Permission denied'));
    const result = await tool.execute({ entityType: 'goal', entityId: '1' });
    expect(result.isError).toBe(true);
  });
});
