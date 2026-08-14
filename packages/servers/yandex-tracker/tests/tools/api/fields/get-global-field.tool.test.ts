/**
 * Unit тесты для GetGlobalFieldTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetGlobalFieldTool } from '#tools/api/fields/get-global-field.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';

describe('GetGlobalFieldTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetGlobalFieldTool;

  beforeEach(() => {
    mockTrackerFacade = { getField: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new GetGlobalFieldTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации при пустом fieldId', async () => {
    const result = await tool.execute({ fieldId: '', fields: ['id'] });
    expect(result.isError).toBe(true);
  });

  it('вернёт глобальное поле по ID', async () => {
    const field = { id: 'customField123', self: 'url', name: 'Custom' };
    vi.mocked(mockTrackerFacade.getField).mockResolvedValue(field);

    const result = await tool.execute({ fieldId: 'customField123', fields: ['id', 'name'] });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.getField).toHaveBeenCalledWith('customField123');
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.getField).mockRejectedValue(new Error('Not found'));
    const result = await tool.execute({ fieldId: 'customField123', fields: ['id'] });
    expect(result.isError).toBe(true);
  });
});
