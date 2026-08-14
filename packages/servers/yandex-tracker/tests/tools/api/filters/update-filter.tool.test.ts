/**
 * Unit тесты для UpdateFilterTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UpdateFilterTool } from '#tools/api/filters/update-filter.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';

describe('UpdateFilterTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: UpdateFilterTool;

  beforeEach(() => {
    mockTrackerFacade = { updateFilter: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new UpdateFilterTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации при пустом filterId', async () => {
    const result = await tool.execute({ filterId: '', fields: ['id'] });
    expect(result.isError).toBe(true);
  });

  it('обновит фильтр', async () => {
    const updated = { id: '1', self: 'url', name: 'Renamed' };
    vi.mocked(mockTrackerFacade.updateFilter).mockResolvedValue(updated);

    const result = await tool.execute({
      filterId: '1',
      name: 'Renamed',
      fields: ['id', 'name'],
    });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.updateFilter).toHaveBeenCalledWith(
      expect.objectContaining({ filterId: '1', name: 'Renamed' })
    );
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.updateFilter).mockRejectedValue(new Error('Not found'));
    const result = await tool.execute({ filterId: '999', fields: ['id'] });
    expect(result.isError).toBe(true);
  });
});
