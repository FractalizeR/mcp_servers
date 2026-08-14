/**
 * Unit тесты для UpdateQueueLocalFieldTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UpdateQueueLocalFieldTool } from '#tools/api/queue-local-fields/update-queue-local-field.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';

describe('UpdateQueueLocalFieldTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: UpdateQueueLocalFieldTool;

  beforeEach(() => {
    mockTrackerFacade = { updateQueueLocalField: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new UpdateQueueLocalFieldTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации при пустом key', async () => {
    const result = await tool.execute({ queueId: 'Q1', key: '', fields: ['id'] });
    expect(result.isError).toBe(true);
  });

  it('обновит поле по короткому key (не по глобальному id)', async () => {
    const updated = { id: 'x--myField', self: 'url', key: 'myField', name: 'Renamed' };
    vi.mocked(mockTrackerFacade.updateQueueLocalField).mockResolvedValue(updated);

    const result = await tool.execute({
      queueId: 'Q1',
      key: 'myField',
      nameEn: 'Renamed',
      fields: ['id', 'name'],
    });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.updateQueueLocalField).toHaveBeenCalledWith(
      expect.objectContaining({ queueId: 'Q1', key: 'myField', nameEn: 'Renamed' })
    );
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.updateQueueLocalField).mockRejectedValue(new Error('Not found'));
    const result = await tool.execute({ queueId: 'Q1', key: 'myField', fields: ['id'] });
    expect(result.isError).toBe(true);
  });
});
