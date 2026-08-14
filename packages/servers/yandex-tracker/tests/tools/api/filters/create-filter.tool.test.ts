/**
 * Unit тесты для CreateFilterTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateFilterTool } from '#tools/api/filters/create-filter.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';

describe('CreateFilterTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: CreateFilterTool;

  beforeEach(() => {
    mockTrackerFacade = { createFilter: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new CreateFilterTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации, если name не указан', async () => {
    const result = await tool.execute({ fields: ['id'] });
    expect(result.isError).toBe(true);
  });

  it('создаст фильтр по query', async () => {
    const created = { id: '1', self: 'url', name: 'Open bugs', query: 'status: Open' };
    vi.mocked(mockTrackerFacade.createFilter).mockResolvedValue(created);

    const result = await tool.execute({
      name: 'Open bugs',
      query: 'status: Open',
      fields: ['id', 'name'],
    });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.createFilter).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Open bugs', query: 'status: Open' })
    );
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.createFilter).mockRejectedValue(new Error('Invalid query'));
    const result = await tool.execute({ name: 'X', query: 'bad', fields: ['id'] });
    expect(result.isError).toBe(true);
  });
});
