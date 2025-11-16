/**
 * Unit тесты для HttpClient
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpClient } from '@infrastructure/http/client/http-client.js';
import type { HttpConfig } from '@infrastructure/http/client/http-config.interface.js';
import type { Logger } from '@infrastructure/logging/index.js';
import type { RetryStrategy } from '@infrastructure/http/retry/retry-strategy.interface.js';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

/**
 * Создаёт мок логгера
 */
function createMockLogger(): Logger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  } as unknown as Logger;
}

/**
 * Создаёт мок retry стратегии (без повторов)
 */
function createMockRetryStrategy(): RetryStrategy {
  return {
    maxRetries: 0, // Без повторов для упрощения тестов
    shouldRetry: (): boolean => false,
    getDelay: (): number => 0,
  };
}

/**
 * Создаёт мок AxiosInstance
 */
function createMockAxiosInstance() {
  const mockInstance = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: {
        use: vi.fn(() => 0),
      },
      response: {
        use: vi.fn(() => 0),
      },
    },
  };
  return mockInstance;
}

describe('HttpClient', () => {
  let httpClient: HttpClient;
  let logger: Logger;
  let config: HttpConfig;
  let retryStrategy: RetryStrategy;
  let mockAxiosInstance: ReturnType<typeof createMockAxiosInstance>;

  beforeEach(() => {
    vi.clearAllMocks();

    logger = createMockLogger();
    retryStrategy = createMockRetryStrategy();
    config = {
      baseURL: 'https://api.tracker.yandex.net',
      timeout: 30000,
      token: 'test-token',
      orgId: 'test-org-id',
    };

    mockAxiosInstance = createMockAxiosInstance();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Мок axios instance для тестирования (type casting)
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

    httpClient = new HttpClient(config, logger, retryStrategy);
  });

  describe('constructor', () => {
    it('должен создать HttpClient с правильной конфигурацией (с orgId)', () => {
      // Arrange
      const configWithOrgId: HttpConfig = {
        baseURL: 'https://api.tracker.yandex.net',
        timeout: 30000,
        token: 'test-token',
        orgId: 'test-org-id',
      };

      // Act
      const client = new HttpClient(configWithOrgId, logger, retryStrategy);

      // Assert
      expect(client).toBeDefined();
      expect(client.get).toBeDefined();
      expect(client.post).toBeDefined();
      expect(client.patch).toBeDefined();
      expect(client.delete).toBeDefined();
    });

    it('должен создать HttpClient с правильной конфигурацией (с cloudOrgId)', () => {
      // Arrange
      const configWithCloudOrgId: HttpConfig = {
        baseURL: 'https://api.tracker.yandex.net',
        timeout: 30000,
        token: 'test-token',
        cloudOrgId: 'bpf3crucp1v2test',
      };

      // Act
      const client = new HttpClient(configWithCloudOrgId, logger, retryStrategy);

      // Assert
      expect(client).toBeDefined();
      expect(client.get).toBeDefined();
      expect(client.post).toBeDefined();
      expect(client.patch).toBeDefined();
      expect(client.delete).toBeDefined();
    });

    it('должен создать HttpClient даже если оба ID не указаны (для тестов)', () => {
      // Arrange
      const configWithoutOrgIds: HttpConfig = {
        baseURL: 'https://api.tracker.yandex.net',
        timeout: 30000,
        token: 'test-token',
      };

      // Act
      const client = new HttpClient(configWithoutOrgIds, logger, retryStrategy);

      // Assert
      expect(client).toBeDefined();
    });
  });

  describe('одиночные методы с retry', () => {
    describe('get', () => {
      it('должен иметь метод get', () => {
        // Assert
        expect(httpClient.get).toBeDefined();
        expect(typeof httpClient.get).toBe('function');
      });

      it('должен отправлять GET запросы с query параметрами', async () => {
        // Arrange
        const mockResponse = { data: { id: '1', name: 'Test' } };
        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        // Act
        const result = await httpClient.get('/v3/issues/TEST-1', { expand: 'all' });

        // Assert
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/v3/issues/TEST-1', {
          params: { expand: 'all' },
        });
        expect(result).toEqual(mockResponse.data);
      });

      it('должен возвращать response.data', async () => {
        // Arrange
        const mockData = { id: '1', key: 'TEST-1' };
        const mockResponse = { data: mockData };
        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        // Act
        const result = await httpClient.get('/v3/issues/TEST-1');

        // Assert
        expect(result).toEqual(mockData);
      });
    });

    describe('post', () => {
      it('должен иметь метод post', () => {
        // Assert
        expect(httpClient.post).toBeDefined();
        expect(typeof httpClient.post).toBe('function');
      });

      it('должен отправлять POST запросы с body', async () => {
        // Arrange
        const postData = { queue: 'TEST', summary: 'New Issue' };
        const mockResponse = { data: { id: '1', key: 'TEST-1' } };
        mockAxiosInstance.post.mockResolvedValue(mockResponse);

        // Act
        const result = await httpClient.post('/v3/issues', postData);

        // Assert
        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/v3/issues', postData);
        expect(result).toEqual(mockResponse.data);
      });

      it('должен возвращать response.data для POST', async () => {
        // Arrange
        const mockData = { id: '1', key: 'TEST-1' };
        const mockResponse = { data: mockData };
        mockAxiosInstance.post.mockResolvedValue(mockResponse);

        // Act
        const result = await httpClient.post('/v3/issues', {});

        // Assert
        expect(result).toEqual(mockData);
      });
    });

    describe('patch', () => {
      it('должен иметь метод patch', () => {
        // Assert
        expect(httpClient.patch).toBeDefined();
        expect(typeof httpClient.patch).toBe('function');
      });

      it('должен отправлять PATCH запросы с body', async () => {
        // Arrange
        const patchData = { summary: 'Updated Summary' };
        const mockResponse = { data: { id: '1', key: 'TEST-1', summary: 'Updated Summary' } };
        mockAxiosInstance.patch.mockResolvedValue(mockResponse);

        // Act
        const result = await httpClient.patch('/v3/issues/TEST-1', patchData);

        // Assert
        expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/v3/issues/TEST-1', patchData);
        expect(result).toEqual(mockResponse.data);
      });
    });

    describe('delete', () => {
      it('должен иметь метод delete', () => {
        // Assert
        expect(httpClient.delete).toBeDefined();
        expect(typeof httpClient.delete).toBe('function');
      });

      it('должен отправлять DELETE запросы', async () => {
        // Arrange
        const mockResponse = { data: { success: true } };
        mockAxiosInstance.delete.mockResolvedValue(mockResponse);

        // Act
        const result = await httpClient.delete('/v3/issues/TEST-1');

        // Assert
        expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/v3/issues/TEST-1');
        expect(result).toEqual(mockResponse.data);
      });
    });

    describe('error handling', () => {
      it('должен обрабатывать network errors', async () => {
        // Arrange
        const networkError = new Error('Network Error');
        mockAxiosInstance.get.mockRejectedValue(networkError);

        // Act & Assert
        await expect(httpClient.get('/v3/issues/TEST-1')).rejects.toThrow('Network Error');
      });

      it('должен обрабатывать timeout errors', async () => {
        // Arrange
        const timeoutError = { code: 'ECONNABORTED', message: 'timeout of 30000ms exceeded' };
        mockAxiosInstance.get.mockRejectedValue(timeoutError);

        // Act & Assert
        await expect(httpClient.get('/v3/issues/TEST-1')).rejects.toMatchObject({
          code: 'ECONNABORTED',
        });
      });

      it('должен обрабатывать non-200 status codes через interceptor', async () => {
        // Arrange
        const error404 = {
          response: { status: 404, statusText: 'Not Found' },
          message: '404 Not Found',
        };
        mockAxiosInstance.get.mockRejectedValue(error404);

        // Act & Assert
        await expect(httpClient.get('/v3/issues/NOTFOUND-1')).rejects.toThrow();
      });
    });
  });
});
