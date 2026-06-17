/**
 * Unit тесты для RawApiRequestOperation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RawApiRequestOperation } from '#tracker_api/api_operations/raw/raw-api-request.operation.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';

describe('RawApiRequestOperation', () => {
  let operation: RawApiRequestOperation;
  let mockHttpClient: IHttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn().mockResolvedValue({ ok: true }),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    } as unknown as IHttpClient;

    mockCacheManager = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      has: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
    } as unknown as CacheManager;

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      child: vi.fn(() => mockLogger),
    } as unknown as Logger;

    operation = new RawApiRequestOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('request', () => {
    it('должна проксировать GET в httpClient с путём и query', async () => {
      const payload = { key: 'QUEUE-1' };
      vi.mocked(mockHttpClient.get).mockResolvedValue(payload);

      const result = await operation.request({
        method: 'GET',
        path: '/v3/issues/QUEUE-1',
        query: { expand: 'transitions', perPage: 50 },
      });

      expect(result).toBe(payload);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/issues/QUEUE-1', {
        expand: 'transitions',
        perPage: 50,
      });
    });

    it('должна работать без query (передаёт undefined)', async () => {
      await operation.request({ method: 'GET', path: '/v2/projects' });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/v2/projects', undefined);
    });

    it('должна сериализовать массив в query как значения через запятую', async () => {
      await operation.request({
        method: 'GET',
        path: '/v3/issues/QUEUE-1',
        query: { expand: ['transitions', 'attachments'] },
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/issues/QUEUE-1', {
        expand: 'transitions,attachments',
      });
    });

    it('должна нормализовать смешанные query (массив + скаляры) без изменения скаляров', async () => {
      await operation.request({
        method: 'GET',
        path: '/v3/issues/QUEUE-1',
        query: { expand: ['comments'], perPage: 50, withDeleted: true, key: 'QUEUE-1' },
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/issues/QUEUE-1', {
        expand: 'comments',
        perPage: 50,
        withDeleted: true,
        key: 'QUEUE-1',
      });
    });

    it('должна сериализовать массив из одного элемента без запятой', async () => {
      await operation.request({
        method: 'GET',
        path: '/v3/issues/QUEUE-1',
        query: { expand: ['transitions'] },
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/v3/issues/QUEUE-1', {
        expand: 'transitions',
      });
    });

    it('должна пробрасывать ошибку httpClient', async () => {
      const error = new Error('boom');
      vi.mocked(mockHttpClient.get).mockRejectedValue(error);

      await expect(operation.request({ method: 'GET', path: '/v3/myself' })).rejects.toThrow(
        'boom'
      );
    });

    it('должна бросать ошибку на неподдерживаемом методе', async () => {
      await expect(
        // @ts-expect-error — намеренно неподдерживаемый метод для проверки guard
        operation.request({ method: 'DELETE', path: '/v3/issues/QUEUE-1' })
      ).rejects.toThrow('Unsupported raw API method');
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });
  });
});
