/**
 * Тесты для BaseOperation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@fractalizer/mcp-infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';

/**
 * Конкретная реализация BaseOperation для тестирования
 */
class TestOperation extends BaseOperation {
  async executeWithCache<T>(key: string, fn: () => Promise<T>): Promise<T> {
    return this.withCache(key, fn);
  }

  async executeDeleteRequest<T>(endpoint: string): Promise<T> {
    return this.deleteRequest<T>(endpoint);
  }

  async executeUploadFile<T>(endpoint: string, formData: FormData): Promise<T> {
    return this.uploadFile<T>(endpoint, formData);
  }

  async executeDownloadFile(endpoint: string): Promise<Buffer> {
    return this.downloadFile(endpoint);
  }
}

function createMockHttpClient(): IHttpClient {
  const mockAxiosInstance = {
    get: vi.fn().mockResolvedValue(null),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
  };

  return {
    get: vi.fn().mockResolvedValue(null),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
    getAxiosInstance: vi.fn(() => mockAxiosInstance),
  } as unknown as IHttpClient;
}

function createMockCache(): CacheManager {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    prune: vi.fn().mockResolvedValue(undefined),
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
  let mockHttpClient: IHttpClient;
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

      (mockCache.get as Mock).mockResolvedValue(cachedValue);

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

      (mockCache.get as Mock).mockResolvedValue(null);
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

      (mockCache.get as Mock).mockResolvedValue(null);
      const fn = vi.fn(async () => value);

      await operation.executeWithCache(cacheKey, fn);

      expect(mockCache.set).toHaveBeenCalledWith(cacheKey, value);
    });
  });

  // DEPRECATED: withRetry() метод удалён из BaseOperation
  // Retry логика теперь только внутри HttpClient методов
  // describe('withRetry', () => { ... });

  describe('deleteRequest', () => {
    it('должен выполнить DELETE запрос через httpClient', async () => {
      const endpoint = '/v2/issues/TEST-1/comments/123';
      const expectedResponse = { success: true };

      (mockHttpClient.delete as Mock).mockResolvedValue(expectedResponse);

      const result = await operation.executeDeleteRequest(endpoint);

      expect(result).toEqual(expectedResponse);
      expect(mockHttpClient.delete).toHaveBeenCalledWith(endpoint);
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining(`DELETE ${endpoint}`));
    });

    it('должен возвращать void для DELETE без тела ответа', async () => {
      const endpoint = '/v2/issues/TEST-1/attachments/456';

      (mockHttpClient.delete as Mock).mockResolvedValue(undefined);

      const result = await operation.executeDeleteRequest<void>(endpoint);

      expect(result).toBeUndefined();
      expect(mockHttpClient.delete).toHaveBeenCalledWith(endpoint);
    });
  });

  describe('uploadFile', () => {
    it('должен загрузить файл через FormData', async () => {
      const endpoint = '/v2/issues/TEST-1/attachments';
      const formData = new FormData();
      const expectedResponse = { id: '789', filename: 'test.pdf' };

      const mockAxiosInstance = (mockHttpClient.getAxiosInstance as Mock)();
      (mockAxiosInstance.post as Mock).mockResolvedValue({ data: expectedResponse });

      const result = await operation.executeUploadFile(endpoint, formData);

      expect(result).toEqual(expectedResponse);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining(`uploading file to ${endpoint}`)
      );
    });
  });

  describe('downloadFile', () => {
    it('должен скачать файл как Buffer', async () => {
      const endpoint = '/v2/issues/TEST-1/attachments/456';
      const fileContent = 'file content';
      const buffer = Buffer.from(fileContent, 'utf-8');
      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      );

      const mockAxiosInstance = (mockHttpClient.getAxiosInstance as Mock)();
      (mockAxiosInstance.get as Mock).mockResolvedValue({ data: arrayBuffer });

      const result = await operation.executeDownloadFile(endpoint);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString('utf-8')).toEqual(fileContent);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(endpoint, {
        responseType: 'arraybuffer',
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining(`downloading file from ${endpoint}`)
      );
    });

    it('должен корректно обрабатывать пустой файл', async () => {
      const endpoint = '/v2/issues/TEST-1/attachments/empty';
      const emptyBuffer = Buffer.from([]);
      const arrayBuffer = emptyBuffer.buffer.slice(
        emptyBuffer.byteOffset,
        emptyBuffer.byteOffset + emptyBuffer.byteLength
      );

      const mockAxiosInstance = (mockHttpClient.getAxiosInstance as Mock)();
      (mockAxiosInstance.get as Mock).mockResolvedValue({ data: arrayBuffer });

      const result = await operation.executeDownloadFile(endpoint);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBe(0);
    });
  });
});
