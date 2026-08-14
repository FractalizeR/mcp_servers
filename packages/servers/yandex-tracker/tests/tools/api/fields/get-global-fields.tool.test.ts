/**
 * Unit тесты для GetGlobalFieldsTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetGlobalFieldsTool } from '#tools/api/fields/get-global-fields.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';

describe('GetGlobalFieldsTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetGlobalFieldsTool;

  beforeEach(() => {
    mockTrackerFacade = { getFields: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new GetGlobalFieldsTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации при пустом fields', async () => {
    const result = await tool.execute({ fields: [] });
    expect(result.isError).toBe(true);
  });

  it('вернёт список глобальных полей', async () => {
    const fields = [
      { id: 'summary', self: 'url', name: 'Summary' },
      { id: 'customField123', self: 'url', name: 'Custom' },
    ];
    vi.mocked(mockTrackerFacade.getFields).mockResolvedValue(fields);

    const result = await tool.execute({ fields: ['id', 'name'] });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.getFields).toHaveBeenCalledWith();
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.getFields).mockRejectedValue(new Error('Unavailable'));
    const result = await tool.execute({ fields: ['id'] });
    expect(result.isError).toBe(true);
  });
});
