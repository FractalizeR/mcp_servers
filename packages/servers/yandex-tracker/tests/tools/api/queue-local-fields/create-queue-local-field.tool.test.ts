/**
 * Unit тесты для CreateQueueLocalFieldTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateQueueLocalFieldTool } from '#tools/api/queue-local-fields/create-queue-local-field.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';

describe('CreateQueueLocalFieldTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: CreateQueueLocalFieldTool;

  beforeEach(() => {
    mockTrackerFacade = { createQueueLocalField: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new CreateQueueLocalFieldTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации, если type не указан', async () => {
    const result = await tool.execute({
      queueId: 'Q1',
      id: 'myField',
      nameEn: 'My Field',
      nameRu: 'Моё поле',
      category: 'cat1',
      fields: ['id'],
    });
    expect(result.isError).toBe(true);
  });

  it('создаст локальное поле', async () => {
    const created = { id: 'x--myField', self: 'url', key: 'myField', name: 'My Field' };
    vi.mocked(mockTrackerFacade.createQueueLocalField).mockResolvedValue(created);

    const result = await tool.execute({
      queueId: 'Q1',
      id: 'myField',
      nameEn: 'My Field',
      nameRu: 'Моё поле',
      category: 'cat1',
      type: 'ru.yandex.startrek.core.fields.StringFieldType',
      fields: ['id', 'key'],
    });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.createQueueLocalField).toHaveBeenCalledWith({
      queueId: 'Q1',
      id: 'myField',
      nameEn: 'My Field',
      nameRu: 'Моё поле',
      category: 'cat1',
      type: 'ru.yandex.startrek.core.fields.StringFieldType',
    });
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.createQueueLocalField).mockRejectedValue(
      new Error('Duplicate key')
    );
    const result = await tool.execute({
      queueId: 'Q1',
      id: 'myField',
      nameEn: 'X',
      nameRu: 'Y',
      category: 'cat1',
      type: 'StringFieldType',
      fields: ['id'],
    });
    expect(result.isError).toBe(true);
  });
});
