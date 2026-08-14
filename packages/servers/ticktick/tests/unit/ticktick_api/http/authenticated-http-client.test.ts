/**
 * Basic tests for AuthenticatedHttpClient
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { ExponentialBackoffStrategy } from '@fractalizer/mcp-infrastructure';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/logger.js';
import { AuthenticatedHttpClient } from '#ticktick_api/http/authenticated-http-client.js';
import type { TickTickOAuthClient } from '#ticktick_api/auth/oauth-client.js';
import { createMockLogger } from '#helpers/index.js';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

function createMockAxiosInstance() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn(() => 0) },
      response: { use: vi.fn(() => 0) },
    },
  };
}

describe('AuthenticatedHttpClient', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockGetAccessToken: ReturnType<typeof vi.fn>;
  let mockAxiosInstance: ReturnType<typeof createMockAxiosInstance>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = createMockLogger();
    mockGetAccessToken = vi.fn().mockResolvedValue('test-token');
    mockAxiosInstance = createMockAxiosInstance();
    mockedAxios.create.mockReturnValue(mockAxiosInstance as unknown as AxiosInstance);
  });

  it('should be instantiable', () => {
    const client = new AuthenticatedHttpClient(
      'https://api.ticktick.com',
      mockGetAccessToken,
      mockLogger,
      { retryCount: 0 }
    );
    expect(client).toBeDefined();
  });

  it('should construct with base URL', () => {
    const client = new AuthenticatedHttpClient(
      'https://api.ticktick.com',
      mockGetAccessToken,
      mockLogger
    );
    expect(client).toBeInstanceOf(AuthenticatedHttpClient);
  });

  /**
   * DoD пакета 1.1.E (Факт 2): `AuthenticatedHttpClient` дёргал `RetryHandler`
   * без передачи `context` — тот подставлял дефолт `{ method: 'get' }`
   * независимо от фактического метода, из-за чего POST-запросы этого клиента
   * повторялись вслепую на 5xx/сеть/таймаут (как до пакета 1.1.C).
   *
   * Используется настоящая `ExponentialBackoffStrategy` (не мок) поверх
   * замоканного axios instance — чтобы проверить фактическое поведение
   * транспорта, а не только то, что клиент передал нужный аргумент.
   */
  describe('retry policy (пакет 1.1.E)', () => {
    function createRealClient(): AuthenticatedHttpClient {
      const realStrategy = new ExponentialBackoffStrategy(2, 1, 5);
      const oauthClient = {
        getAccessToken: vi.fn().mockResolvedValue('test-token'),
      } as unknown as TickTickOAuthClient;

      return new AuthenticatedHttpClient(
        oauthClient,
        { baseUrl: 'https://api.ticktick.com/open/v1', timeout: 30000 },
        mockLogger as unknown as Logger,
        realStrategy
      );
    }

    it('DoD: POST на 504 без idempotencyDeclared НЕ повторяется', async () => {
      const client = createRealClient();
      const error504 = { statusCode: 504, message: 'Gateway Timeout' };
      mockAxiosInstance.post.mockRejectedValue(error504);

      await expect(client.post('/task', { title: 'x' })).rejects.toEqual(error504);

      // Только первоначальная попытка — повтора не было (до фикса клиент
      // подставлял дефолтный context `{ method: 'get' }`, и повтор происходил
      // как для безопасного GET).
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
    });

    it('GET на 504 повторяется как прежде', async () => {
      const client = createRealClient();
      const error504 = { statusCode: 504, message: 'Gateway Timeout' };
      mockAxiosInstance.get.mockRejectedValue(error504);

      await expect(client.get('/task/1')).rejects.toEqual(error504);

      // Первоначальная попытка + 2 retry (maxRetries=2).
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
    });

    it('POST на 429 повторяется', async () => {
      const client = createRealClient();
      const error429 = { statusCode: 429, message: 'Too Many Requests', retryAfter: 0 };
      mockAxiosInstance.post.mockRejectedValue(error429);

      await expect(client.post('/task', { title: 'x' })).rejects.toEqual(error429);

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3);
    });
  });
});
