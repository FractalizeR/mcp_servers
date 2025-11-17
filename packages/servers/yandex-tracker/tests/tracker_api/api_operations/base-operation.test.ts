/**
 * Тесты для BaseOperation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';
import type { HttpClient } from '@mcp-framework/infrastructure/http/client/http-client.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';

/**
 * Конкретная реализация BaseOperation для тестирования
 */
class TestOperation extends BaseOperation {
  async executeWithCache<T>(key: string, fn: () => Promise<T>): Promise<T> {
    return this.withCache(key, fn);
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
  let mockCache: CacheManager;
  let mockLogger: Logger;
  let operation: TestOperation;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockCache = createMockCache();
    mockLogger = createMockLogger();

    operation = new TestOperation(mockHttpClient, mockCache, mockLogger);

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
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('cache hit'));
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
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('cache miss'));
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

  // DEPRECATED: withRetry() метод удалён из BaseOperation
  // Retry логика теперь только внутри HttpClient методов
  // describe('withRetry', () => { ... });
});
