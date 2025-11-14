/**
 * Тесты для BaseOperation
 */

import {describe, it, expect, beforeEach, vi} from 'vitest';
import type { Mock } from 'vitest';
import { BaseOperation } from '@domain/operations/base-operation.js';
import type { HttpClient } from '@infrastructure/http/client/http-client.js';
import type { RetryHandler } from '@infrastructure/http/retry/retry-handler.js';
import type { CacheManager } from '@infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@infrastructure/logger.js';

/**
 * Конкретная реализация BaseOperation для тестирования
 */
class TestOperation extends BaseOperation {
  async executeWithCache<T>(key: string, fn: () => Promise<T>): Promise<T> {
    return this.withCache(key, fn);
  }

  async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    return this.withRetry(fn);
  }
}

function createMockHttpClient(): HttpClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  } as unknown as HttpClient;
}

function createMockRetryHandler(): RetryHandler {
  return {
    executeWithRetry: vi.fn(<T>(fn: () => Promise<T>) => fn()),
  } as unknown as RetryHandler;
}

function createMockCache(): CacheManager {
  return {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
    prune: vi.fn(),
  } as unknown as CacheManager;
}

function createMockLogger(): Logger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  } as unknown as Logger;
}

describe('BaseOperation', () => {
  let mockHttpClient: HttpClient;
  let mockRetryHandler: RetryHandler;
  let mockCache: CacheManager;
  let mockLogger: Logger;
  let operation: TestOperation;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockRetryHandler = createMockRetryHandler();
    mockCache = createMockCache();
    mockLogger = createMockLogger();

    operation = new TestOperation(
      mockHttpClient,
      mockRetryHandler,
      mockCache,
      mockLogger
    );

    vi.clearAllMocks();
  });

  describe('withCache', () => {
    it('должен вернуть значение из кеша при наличии', async () => {
      const cacheKey = 'test:key';
      const cachedValue = { data: 'cached' };

      (mockCache.get as Mock).mockReturnValue(cachedValue);

      const fn = vi.fn<() => Promise<unknown>>();
      const result = await operation.executeWithCache(cacheKey, fn);

      expect(result).toEqual(cachedValue);
      expect(mockCache.get).toHaveBeenCalledWith(cacheKey);
      expect(fn).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('cache hit')
      );
    });

    it('должен выполнить функцию при отсутствии в кеше', async () => {
      const cacheKey = 'test:key';
      const freshValue = { data: 'fresh' };

      (mockCache.get as Mock).mockReturnValue(undefined);
      const fn = vi.fn(async () => freshValue);

      const result = await operation.executeWithCache(cacheKey, fn);

      expect(result).toEqual(freshValue);
      expect(mockCache.get).toHaveBeenCalledWith(cacheKey);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(mockCache.set).toHaveBeenCalledWith(cacheKey, freshValue);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('cache miss')
      );
    });

    it('должен сохранить результат в кеш', async () => {
      const cacheKey = 'test:key';
      const value = { data: 'new' };

      (mockCache.get as Mock).mockReturnValue(undefined);
      const fn = vi.fn(async () => value);

      await operation.executeWithCache(cacheKey, fn);

      expect(mockCache.set).toHaveBeenCalledWith(cacheKey, value);
    });
  });

  describe('withRetry', () => {
    it('должен делегировать выполнение RetryHandler', async () => {
      const fn = vi.fn(async () => 'result');

      const result = await operation.executeWithRetry(fn);

      expect(result).toBe('result');
      expect(mockRetryHandler.executeWithRetry).toHaveBeenCalledWith(fn);
    });

    it('должен пробросить ошибку от RetryHandler', async () => {
      const error = new Error('Retry failed');
      const fn = vi.fn(async () => { throw error; });

      vi.mocked(mockRetryHandler.executeWithRetry).mockRejectedValue(error);

      await expect(operation.executeWithRetry(fn)).rejects.toThrow('Retry failed');
    });
  });
});
