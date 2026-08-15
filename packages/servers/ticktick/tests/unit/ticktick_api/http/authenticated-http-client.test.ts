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

  /**
   * Строит клиента с реальным `TickTickOAuthClient`-подобным моком и реальной
   * `ExponentialBackoffStrategy` поверх замоканного axios instance — так тесты
   * проверяют фактическое поведение метода/конверта/interceptor'ов, а не
   * только то, что клиент дозвонился до нужного мока.
   */
  function createClient(getAccessToken = mockGetAccessToken): AuthenticatedHttpClient {
    const oauthClient = { getAccessToken } as unknown as TickTickOAuthClient;
    const strategy = new ExponentialBackoffStrategy(2, 1, 5);
    return new AuthenticatedHttpClient(
      oauthClient,
      { baseUrl: 'https://api.ticktick.com/open/v1', timeout: 30000 },
      mockLogger as unknown as Logger,
      strategy
    );
  }

  it('constructs the underlying axios instance with baseURL/timeout/default headers', () => {
    createClient();
    expect(mockedAxios.create).toHaveBeenCalledWith({
      baseURL: 'https://api.ticktick.com/open/v1',
      timeout: 30000,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });
  });

  it('registers exactly one request and one response interceptor', () => {
    createClient();
    expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalledTimes(1);
    expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalledTimes(1);
  });

  it('exposes the underlying axios instance via getAxiosInstance()', () => {
    const client = createClient();
    expect(client.getAxiosInstance()).toBe(mockAxiosInstance);
  });

  describe('HTTP verbs (happy paths)', () => {
    it('get() returns response data and forwards query params', async () => {
      const client = createClient();
      mockAxiosInstance.get.mockResolvedValue({ data: { id: 1 }, headers: {} });

      const result = await client.get('/task/1', { foo: 'bar' });

      expect(result).toEqual({ id: 1 });
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/task/1', { params: { foo: 'bar' } });
    });

    it('post() returns response data and calls axios without a config object when no params given', async () => {
      const client = createClient();
      mockAxiosInstance.post.mockResolvedValue({ data: { ok: true }, headers: {} });

      const result = await client.post('/task', { title: 'x' });

      expect(result).toEqual({ ok: true });
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/task', { title: 'x' });
    });

    it('getWithResponse() returns data together with normalized headers', async () => {
      const client = createClient();
      mockAxiosInstance.get.mockResolvedValue({
        data: { id: 1 },
        headers: { 'X-Total-Count': '5' },
      });

      const envelope = await client.getWithResponse('/tasks');

      expect(envelope.data).toEqual({ id: 1 });
      expect(envelope.headers['x-total-count']).toBe('5');
    });

    it('postWithResponse() forwards params via config and returns the envelope', async () => {
      const client = createClient();
      mockAxiosInstance.post.mockResolvedValue({ data: { id: 2 }, headers: {} });

      const envelope = await client.postWithResponse('/search', { q: 'x' }, { page: 1 }, true);

      expect(envelope.data).toEqual({ id: 2 });
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/search',
        { q: 'x' },
        { params: { page: 1 } }
      );
    });

    it('patch() returns response data directly (no retry-context envelope)', async () => {
      const client = createClient();
      mockAxiosInstance.patch.mockResolvedValue({ data: { updated: true } });

      const result = await client.patch('/task/1', { title: 'y' });

      expect(result).toEqual({ updated: true });
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/task/1', { title: 'y' });
    });

    it('delete() sends the body via config.data and returns response data', async () => {
      const client = createClient();
      mockAxiosInstance.delete.mockResolvedValue({ data: { deleted: true } });

      const result = await client.delete('/task/1', { reason: 'done' });

      expect(result).toEqual({ deleted: true });
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/task/1', {
        data: { reason: 'done' },
      });
    });
  });

  describe('request interceptor', () => {
    it('fetches a fresh token and sets the Authorization header', async () => {
      const getAccessToken = vi.fn().mockResolvedValue('fresh-token');
      createClient(getAccessToken);
      const [onFulfilled] = mockAxiosInstance.interceptors.request.use.mock.calls[0] as [
        (config: { headers: Record<string, string>; method?: string; url?: string }) => Promise<{
          headers: Record<string, string>;
        }>,
      ];

      const config = { headers: {}, method: 'get', url: '/task' };
      const result = await onFulfilled(config);

      expect(getAccessToken).toHaveBeenCalledTimes(1);
      expect(result.headers['Authorization']).toBe('Bearer fresh-token');
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('GET /task'));
    });

    it('logs and rejects when building the request fails', async () => {
      createClient();
      const [, onRejected] = mockAxiosInstance.interceptors.request.use.mock.calls[0] as [
        unknown,
        (error: unknown) => Promise<never>,
      ];
      const error = new Error('boom');

      await expect(onRejected(error)).rejects.toBe(error);
      expect(mockLogger.error).toHaveBeenCalledWith('HTTP Request Error:', error);
    });
  });

  describe('response interceptor', () => {
    it('logs and passes successful responses through unchanged', () => {
      createClient();
      const [onFulfilled] = mockAxiosInstance.interceptors.response.use.mock.calls[0] as [
        (response: { status: number; config: { url?: string } }) => unknown,
      ];
      const response = { status: 200, config: { url: '/task' } };

      const result = onFulfilled(response);

      expect(result).toBe(response);
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('200 /task'));
    });

    it('maps axios errors to ApiError and rejects with the mapped error', async () => {
      createClient();
      const [, onRejected] = mockAxiosInstance.interceptors.response.use.mock.calls[0] as [
        unknown,
        (error: unknown) => Promise<never>,
      ];
      // No `response` and no `request` on the error -> ErrorMapper's third
      // branch (request setup failure), mapped to statusCode 0.
      const axiosError = { message: 'Network Error' };

      await expect(onRejected(axiosError)).rejects.toMatchObject({
        statusCode: 0,
        message: 'Network Error',
      });
      expect(mockLogger.error).toHaveBeenCalledWith('HTTP Response Error:', expect.anything());
    });
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
