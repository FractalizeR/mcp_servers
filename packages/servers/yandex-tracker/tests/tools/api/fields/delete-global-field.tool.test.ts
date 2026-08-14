/**
 * Unit тесты для DeleteGlobalFieldTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeleteGlobalFieldTool } from '#tools/api/fields/delete-global-field.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';

describe('DeleteGlobalFieldTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: DeleteGlobalFieldTool;

  beforeEach(() => {
    mockTrackerFacade = { deleteField: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new DeleteGlobalFieldTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации при пустом fieldId', async () => {
    const result = await tool.execute({ fieldId: '' });
    expect(result.isError).toBe(true);
  });

  it('удалит глобальное поле', async () => {
    vi.mocked(mockTrackerFacade.deleteField).mockResolvedValue(undefined);

    const result = await tool.execute({ fieldId: 'customerPriority' });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.deleteField).toHaveBeenCalledWith('customerPriority');
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.deleteField).mockRejectedValue(new Error('Not found'));
    const result = await tool.execute({ fieldId: 'customerPriority' });
    expect(result.isError).toBe(true);
  });
});
