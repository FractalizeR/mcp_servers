/**
 * Unit тесты для HttpClient
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpClient } from '@infrastructure/http/client/http-client.js';
import type { HttpConfig } from '@infrastructure/http/client/http-config.interface.js';
import type { Logger } from '@infrastructure/logging/index.js';
import type { RetryStrategy } from '@infrastructure/http/retry/retry-strategy.interface.js';

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

describe('HttpClient', () => {
  let httpClient: HttpClient;
  let logger: Logger;
  let config: HttpConfig;
  let retryStrategy: RetryStrategy;

  beforeEach(() => {
    logger = createMockLogger();
    retryStrategy = createMockRetryStrategy();
    config = {
      baseURL: 'https://api.tracker.yandex.net',
      timeout: 30000,
      token: 'test-token',
      orgId: 'test-org-id',
      maxBatchSize: 100,
      maxConcurrentRequests: 5,
    };

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
        maxBatchSize: 100,
        maxConcurrentRequests: 5,
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
        maxBatchSize: 100,
        maxConcurrentRequests: 5,
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
        maxBatchSize: 100,
        maxConcurrentRequests: 5,
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
    });

    describe('post', () => {
      it('должен иметь метод post', () => {
        // Assert
        expect(httpClient.post).toBeDefined();
        expect(typeof httpClient.post).toBe('function');
      });
    });

    describe('patch', () => {
      it('должен иметь метод patch', () => {
        // Assert
        expect(httpClient.patch).toBeDefined();
        expect(typeof httpClient.patch).toBe('function');
      });
    });

    describe('delete', () => {
      it('должен иметь метод delete', () => {
        // Assert
        expect(httpClient.delete).toBeDefined();
        expect(typeof httpClient.delete).toBe('function');
      });
    });
  });

  describe('пакетные методы', () => {
    describe('getBatch', () => {
      it('должен иметь метод getBatch', () => {
        // Assert
        expect(httpClient.getBatch).toBeDefined();
        expect(typeof httpClient.getBatch).toBe('function');
      });
    });

    describe('postBatch', () => {
      it('должен иметь метод postBatch', () => {
        // Assert
        expect(httpClient.postBatch).toBeDefined();
        expect(typeof httpClient.postBatch).toBe('function');
      });
    });

    describe('patchBatch', () => {
      it('должен иметь метод patchBatch', () => {
        // Assert
        expect(httpClient.patchBatch).toBeDefined();
        expect(typeof httpClient.patchBatch).toBe('function');
      });
    });

    describe('deleteBatch', () => {
      it('должен иметь метод deleteBatch', () => {
        // Assert
        expect(httpClient.deleteBatch).toBeDefined();
        expect(typeof httpClient.deleteBatch).toBe('function');
      });
    });
  });
});
