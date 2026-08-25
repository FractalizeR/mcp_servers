/**
 * Форма тела `POST /v3/fields` (D10, `0_CONTRACTS.md`): `id`/`name{en,ru}`/
 * `category`/`type` обязательны, ключа `schema` в запросе нет — он приходит
 * только в ответе.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import { CreateFieldOperation } from '#tracker_api/api_operations/field/create-field.operation.js';
import type { CreateFieldDto } from '#tracker_api/dto/index.js';
import { createGlobalFieldFixture } from '#helpers/global-fields.fixture.js';

describe('CreateFieldOperation', () => {
  let operation: CreateFieldOperation;
  let mockHttpClient: IHttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as unknown as IHttpClient;

    mockCacheManager = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      has: vi.fn(),
    } as unknown as CacheManager;

    mockLogger = {
      child: vi.fn().mockReturnThis(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    operation = new CreateFieldOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  it('отправляет ровно тело D10 — без ключа schema', async () => {
    const input: CreateFieldDto = {
      id: 'customPriority',
      name: { en: 'Custom Priority', ru: 'Пользовательский приоритет' },
      category: 'category1',
      type: 'ru.yandex.startrek.core.fields.StringFieldType',
    };
    const mockField = createGlobalFieldFixture({ id: 'customPriority' });
    vi.mocked(mockHttpClient.post).mockResolvedValue(mockField);

    const result = await operation.execute(input);

    expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/fields', input);
    expect(mockHttpClient.post).toHaveBeenCalledWith(
      '/v3/fields',
      expect.not.objectContaining({ schema: expect.anything() })
    );
    expect(result).toEqual(mockField);
  });

  it('передаёт опциональные ключи, если они заданы', async () => {
    const input: CreateFieldDto = {
      id: 'customPriority',
      name: { en: 'Custom Priority', ru: 'Пользовательский приоритет' },
      category: 'category1',
      type: 'ru.yandex.startrek.core.fields.StringFieldType',
      order: 5,
      description: 'Priority set by customer',
      readonly: false,
      visible: true,
      hidden: false,
      container: false,
      optionsProvider: { type: 'UserProvider' },
    };
    const mockField = createGlobalFieldFixture({ id: 'customPriority' });
    vi.mocked(mockHttpClient.post).mockResolvedValue(mockField);

    await operation.execute(input);

    expect(mockHttpClient.post).toHaveBeenCalledWith('/v3/fields', input);
  });

  it('инвалидирует кеш списка полей и кеширует созданное поле', async () => {
    const input: CreateFieldDto = {
      id: 'customPriority',
      name: { en: 'Custom Priority', ru: 'Пользовательский приоритет' },
      category: 'category1',
      type: 'ru.yandex.startrek.core.fields.StringFieldType',
    };
    const mockField = createGlobalFieldFixture({ id: 'customPriority' });
    vi.mocked(mockHttpClient.post).mockResolvedValue(mockField);

    await operation.execute(input);

    expect(mockCacheManager.delete).toHaveBeenCalledWith(expect.stringContaining('all'));
    expect(mockCacheManager.set).toHaveBeenCalledWith(
      expect.stringContaining('customPriority'),
      mockField
    );
  });

  it('пробрасывает ошибку API без изменений', async () => {
    const input: CreateFieldDto = {
      id: 'customPriority',
      name: { en: 'Custom Priority', ru: 'Пользовательский приоритет' },
      category: 'category1',
      type: 'ru.yandex.startrek.core.fields.StringFieldType',
    };
    const error = new Error('Forbidden');
    vi.mocked(mockHttpClient.post).mockRejectedValue(error);

    await expect(operation.execute(input)).rejects.toThrow('Forbidden');
  });
});
