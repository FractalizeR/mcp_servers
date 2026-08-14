/**
 * Unit тесты для UpdateGlobalFieldTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UpdateGlobalFieldTool } from '#tools/api/fields/update-global-field.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';

describe('UpdateGlobalFieldTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: UpdateGlobalFieldTool;

  beforeEach(() => {
    mockTrackerFacade = { updateField: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new UpdateGlobalFieldTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации при пустом fieldId', async () => {
    const result = await tool.execute({ fieldId: '', fields: ['id'] });
    expect(result.isError).toBe(true);
  });

  it('обновит глобальное поле', async () => {
    const updated = { id: 'customerPriority', self: 'url', name: 'Updated Name' };
    vi.mocked(mockTrackerFacade.updateField).mockResolvedValue(updated);

    const result = await tool.execute({
      fieldId: 'customerPriority',
      name: 'Updated Name',
      fields: ['id', 'name'],
    });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.updateField).toHaveBeenCalledWith('customerPriority', {
      name: 'Updated Name',
    });
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.updateField).mockRejectedValue(new Error('Not found'));
    const result = await tool.execute({ fieldId: 'customerPriority', fields: ['id'] });
    expect(result.isError).toBe(true);
  });
});
