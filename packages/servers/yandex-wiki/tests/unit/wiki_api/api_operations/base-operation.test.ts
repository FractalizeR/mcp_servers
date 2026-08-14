// tests/unit/wiki_api/api_operations/base-operation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseOperation } from '#wiki_api/api_operations/base-operation.js';
import { createMockHttpClient, createMockCacheManager, createMockLogger } from '#helpers/index.js';
import type { IHttpClient, CacheManager, Logger } from '@fractalizer/mcp-infrastructure';

// Конкретная имплементация для тестирования абстрактного класса
class TestOperation extends BaseOperation {
  async testWithCache<T>(cacheKey: string, fn: () => Promise<T>): Promise<T> {
    return this.withCache(cacheKey, fn);
  }

  async testDeleteRequest<T>(endpoint: string): Promise<T> {
    return this.deleteRequest<T>(endpoint);
  }

  async testPutBinary<T>(endpoint: string, buffer: Buffer, contentType?: string): Promise<T> {
    return contentType !== undefined
      ? this.putBinary<T>(endpoint, buffer, contentType)
      : this.putBinary<T>(endpoint, buffer);
  }

  async testDownloadFile(endpoint: string) {
    return this.downloadFile(endpoint);
  }
}

describe('BaseOperation', () => {
  let operation: TestOperation;
  let mockHttpClient: IHttpClient;
  let mockCacheManager: CacheManager;
  let mockLogger: Logger;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    mockCacheManager = createMockCacheManager();
    mockLogger = createMockLogger();
    operation = new TestOperation(mockHttpClient, mockCacheManager, mockLogger);
  });

  describe('withCache', () => {
    it('должен вернуть закешированное значение при cache hit', async () => {
      const cacheKey = 'test-key';
      const cachedValue = { data: 'cached' };
      vi.mocked(mockCacheManager.get).mockResolvedValue(cachedValue);

      const fn = vi.fn().mockResolvedValue({ data: 'fresh' });
      const result = await operation.testWithCache(cacheKey, fn);

      expect(mockCacheManager.get).toHaveBeenCalledWith(cacheKey);
      expect(result).toEqual(cachedValue);
      expect(fn).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(`Operation cache hit: ${cacheKey}`);
    });

    it('должен выполнить функцию и закешировать результат при cache miss', async () => {
      const cacheKey = 'test-key';
      const freshValue = { data: 'fresh' };
      vi.mocked(mockCacheManager.get).mockResolvedValue(null);

      const fn = vi.fn().mockResolvedValue(freshValue);
      const result = await operation.testWithCache(cacheKey, fn);

      expect(mockCacheManager.get).toHaveBeenCalledWith(cacheKey);
      expect(fn).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalledWith(cacheKey, freshValue);
      expect(result).toEqual(freshValue);
      expect(mockLogger.debug).toHaveBeenCalledWith(`Operation cache miss: ${cacheKey}`);
    });

    it('должен пробрасывать ошибки из функции', async () => {
      const cacheKey = 'test-key';
      const error = new Error('Function error');
      vi.mocked(mockCacheManager.get).mockResolvedValue(null);

      const fn = vi.fn().mockRejectedValue(error);

      await expect(operation.testWithCache(cacheKey, fn)).rejects.toThrow('Function error');
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });

    it('должен корректно обрабатывать разные типы данных в кеше', async () => {
      const testCases = [
        { key: 'string-key', value: 'test string' },
        { key: 'number-key', value: 42 },
        { key: 'array-key', value: [1, 2, 3] },
        { key: 'object-key', value: { nested: { data: true } } },
      ];

      for (const { key, value } of testCases) {
        vi.mocked(mockCacheManager.get).mockResolvedValue(null);
        const fn = vi.fn().mockResolvedValue(value);

        const result = await operation.testWithCache(key, fn);

        expect(result).toEqual(value);
        expect(mockCacheManager.set).toHaveBeenCalledWith(key, value);
      }
    });
  });

  describe('deleteRequest', () => {
    it('должен выполнить DELETE запрос через http клиент', async () => {
      const endpoint = '/v1/pages/123';
      const expectedResponse = { success: true };
      vi.mocked(mockHttpClient.delete).mockResolvedValue(expectedResponse);

      const result = await operation.testDeleteRequest(endpoint);

      expect(mockHttpClient.delete).toHaveBeenCalledWith(endpoint);
      expect(result).toEqual(expectedResponse);
      expect(mockLogger.debug).toHaveBeenCalledWith(`BaseOperation: DELETE ${endpoint}`);
    });

    it('должен корректно обрабатывать void ответ', async () => {
      const endpoint = '/v1/grids/456';
      vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

      const result = await operation.testDeleteRequest<void>(endpoint);

      expect(mockHttpClient.delete).toHaveBeenCalledWith(endpoint);
      expect(result).toBeUndefined();
    });

    it('должен пробрасывать ошибки HTTP клиента', async () => {
      const endpoint = '/v1/pages/999';
      const error = new Error('Network error');
      vi.mocked(mockHttpClient.delete).mockRejectedValue(error);

      await expect(operation.testDeleteRequest(endpoint)).rejects.toThrow('Network error');
    });
  });

  describe('putBinary (пакет 7.2.D)', () => {
    it('должен отправить PUT через getAxiosInstance() с бинарным телом и default content-type', async () => {
      const axiosPut = vi.fn().mockResolvedValue({ data: { ok: true } });
      vi.mocked(mockHttpClient.getAxiosInstance!).mockReturnValue({ put: axiosPut } as never);

      const buffer = Buffer.from('binary payload');
      const result = await operation.testPutBinary('/v1/upload_sessions/s1/upload_part', buffer);

      expect(axiosPut).toHaveBeenCalledWith('/v1/upload_sessions/s1/upload_part', buffer, {
        headers: { 'Content-Type': 'application/octet-stream' },
      });
      expect(result).toEqual({ ok: true });
    });

    it('должен использовать переданный content-type вместо default', async () => {
      const axiosPut = vi.fn().mockResolvedValue({ data: {} });
      vi.mocked(mockHttpClient.getAxiosInstance!).mockReturnValue({ put: axiosPut } as never);

      await operation.testPutBinary('/x', Buffer.from('y'), 'text/plain');

      expect(axiosPut).toHaveBeenCalledWith(
        '/x',
        Buffer.from('y'),
        expect.objectContaining({ headers: { 'Content-Type': 'text/plain' } })
      );
    });

    it('должен бросить понятную ошибку, если getAxiosInstance недоступен', async () => {
      vi.mocked(mockHttpClient.getAxiosInstance!).mockReturnValue(undefined as never);

      await expect(operation.testPutBinary('/x', Buffer.from('y'))).rejects.toThrow(
        'HTTP client does not support getAxiosInstance'
      );
    });
  });

  describe('downloadFile (пакет 7.2.D)', () => {
    it('должен вернуть content как Buffer и contentType из заголовков ответа', async () => {
      const axiosGet = vi.fn().mockResolvedValue({
        data: Buffer.from('file bytes'),
        headers: { 'content-type': 'application/pdf' },
      });
      vi.mocked(mockHttpClient.getAxiosInstance!).mockReturnValue({ get: axiosGet } as never);

      const result = await operation.testDownloadFile('/v1/pages/1/attachments/2/download');

      expect(axiosGet).toHaveBeenCalledWith('/v1/pages/1/attachments/2/download', {
        responseType: 'arraybuffer',
      });
      expect(result.content).toEqual(Buffer.from('file bytes'));
      expect(result.contentType).toBe('application/pdf');
    });

    it('должен опустить contentType, если заголовок отсутствует', async () => {
      const axiosGet = vi.fn().mockResolvedValue({ data: Buffer.from('x'), headers: {} });
      vi.mocked(mockHttpClient.getAxiosInstance!).mockReturnValue({ get: axiosGet } as never);

      const result = await operation.testDownloadFile('/x');

      expect(result.contentType).toBeUndefined();
    });

    it('должен бросить понятную ошибку, если getAxiosInstance недоступен', async () => {
      vi.mocked(mockHttpClient.getAxiosInstance!).mockReturnValue(undefined as never);

      await expect(operation.testDownloadFile('/x')).rejects.toThrow(
        'HTTP client does not support getAxiosInstance'
      );
    });
  });
});
