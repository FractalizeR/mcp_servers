/**
 * Unit тесты для CreateGlobalFieldTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateGlobalFieldTool } from '#tools/api/fields/create-global-field.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';

describe('CreateGlobalFieldTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: CreateGlobalFieldTool;

  beforeEach(() => {
    mockTrackerFacade = { createField: vi.fn() } as unknown as YandexTrackerFacade;
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;
    tool = new CreateGlobalFieldTool(mockTrackerFacade, mockLogger);
  });

  it('вернёт ошибку валидации, если schema не указана', async () => {
    const result = await tool.execute({
      name: 'Customer Priority',
      fields: ['id'],
    });
    expect(result.isError).toBe(true);
  });

  it('создаст глобальное поле', async () => {
    const created = { id: 'customerPriority', self: 'url', name: 'Customer Priority' };
    vi.mocked(mockTrackerFacade.createField).mockResolvedValue(created);

    const result = await tool.execute({
      name: 'Customer Priority',
      description: 'Priority set by customer',
      schema: { type: 'string' },
      fields: ['id', 'name'],
    });

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.createField).toHaveBeenCalledWith({
      name: 'Customer Priority',
      description: 'Priority set by customer',
      schema: { type: 'string' },
    });
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.createField).mockRejectedValue(new Error('Forbidden'));
    const result = await tool.execute({
      name: 'X',
      schema: { type: 'string' },
      fields: ['id'],
    });
    expect(result.isError).toBe(true);
  });
});
