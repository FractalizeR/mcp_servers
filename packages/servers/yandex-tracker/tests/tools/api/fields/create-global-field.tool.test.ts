/**
 * Unit тесты для CreateGlobalFieldTool
 *
 * Форма тела D10 (`0_CONTRACTS.md`): `id`/`name{en,ru}`/`category`/`type`
 * обязательны, ключа `schema` в запросе нет.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateGlobalFieldTool } from '#tools/api/fields/create-global-field.tool.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';

describe('CreateGlobalFieldTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: CreateGlobalFieldTool;

  const validInput = {
    id: 'customerPriority',
    name: { en: 'Customer Priority', ru: 'Приоритет клиента' },
    category: 'category1',
    type: 'ru.yandex.startrek.core.fields.StringFieldType',
    fields: ['id', 'name'],
  };

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

  describe('getDefinition', () => {
    it('описание category должно называть способ его добыть', () => {
      const definition = tool.getDefinition();
      const categoryProp = definition.inputSchema.properties?.['category'] as {
        description?: string;
      };

      expect(categoryProp.description ?? '').toContain('GET /v3/fields/categories');
    });

    it('описание type должно называть форму значения', () => {
      const definition = tool.getDefinition();
      const typeProp = definition.inputSchema.properties?.['type'] as { description?: string };

      expect(typeProp.description ?? '').toContain('ru.yandex.startrek.core.fields');
    });
  });

  it('вернёт ошибку валидации, если id не указан', async () => {
    const { id: _id, ...rest } = validInput;
    const result = await tool.execute(rest);
    expect(result.isError).toBe(true);
  });

  it('вернёт ошибку валидации, если category не указана', async () => {
    const { category: _category, ...rest } = validInput;
    const result = await tool.execute(rest);
    expect(result.isError).toBe(true);
  });

  it('вернёт ошибку валидации, если type не указан', async () => {
    const { type: _type, ...rest } = validInput;
    const result = await tool.execute(rest);
    expect(result.isError).toBe(true);
  });

  it('вернёт ошибку валидации, если name — строка, а не {en, ru}', async () => {
    const result = await tool.execute({ ...validInput, name: 'Customer Priority' });
    expect(result.isError).toBe(true);
  });

  it('создаст глобальное поле', async () => {
    const created = { id: 'customerPriority', self: 'url', name: 'Customer Priority' };
    vi.mocked(mockTrackerFacade.createField).mockResolvedValue(created);

    const result = await tool.execute(validInput);

    expect(result.isError).toBeUndefined();
    expect(mockTrackerFacade.createField).toHaveBeenCalledWith({
      id: 'customerPriority',
      name: { en: 'Customer Priority', ru: 'Приоритет клиента' },
      category: 'category1',
      type: 'ru.yandex.startrek.core.fields.StringFieldType',
    });
  });

  it('обработает ошибку facade', async () => {
    vi.mocked(mockTrackerFacade.createField).mockRejectedValue(new Error('Forbidden'));
    const result = await tool.execute(validInput);
    expect(result.isError).toBe(true);
  });
});
