/**
 * Authenticated HTTP Client for TickTick API
 *
 * Wraps base HTTP operations and adds Bearer token authentication.
 * Automatically refreshes tokens via OAuth client when needed.
 */

import axios from 'axios';
import type {
  AxiosInstance,
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';
import type {
  IHttpClient,
  QueryParams,
  RetryStrategy,
  HttpResponseEnvelope,
} from '@fractalizer/mcp-infrastructure';
import { RetryHandler, ErrorMapper, normalizeHeaders } from '@fractalizer/mcp-infrastructure';
import type { Logger } from '@fractalizer/mcp-infrastructure';
import type { TickTickOAuthClient } from '../auth/oauth-client.js';

/** HTTP-методы, поддерживающие возврат конверта с заголовками. */
type EnvelopeMethod = 'get' | 'post';

/**
 * Configuration for AuthenticatedHttpClient
 */
export interface AuthenticatedHttpConfig {
  /** Base URL for API requests */
  baseUrl: string;
  /** Request timeout in milliseconds */
  timeout: number;
}

/**
 * HTTP client with automatic Bearer token authentication
 *
 * Responsibilities:
 * - Add Authorization: Bearer header to all requests
 * - Delegate HTTP operations to axios
 * - Integrate with retry strategy
 * - Log requests/responses
 *
 * NOT responsible for:
 * - Token management (delegated to TickTickOAuthClient)
 * - Caching (handled separately)
 * - Business logic (handled by Operations)
 */
export class AuthenticatedHttpClient implements IHttpClient {
  private readonly client: AxiosInstance;
  private readonly retryHandler: RetryHandler;

  constructor(
    private readonly oauthClient: TickTickOAuthClient,
    config: AuthenticatedHttpConfig,
    private readonly logger: Logger,
    retryStrategy: RetryStrategy
  ) {
    this.retryHandler = new RetryHandler(retryStrategy, logger);

    // Create axios instance
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    // Setup interceptors
    this.setupInterceptors();
  }

  /**
   * Setup axios interceptors for auth and logging
   */
  private setupInterceptors(): void {
    // Request interceptor: add auth header and log
    this.client.interceptors.request.use(
      async (axiosConfig: InternalAxiosRequestConfig) => {
        // Get fresh token (auto-refreshes if needed)
        const token = await this.oauthClient.getAccessToken();
        axiosConfig.headers.Authorization = `Bearer ${token}`;

        this.logger.debug(`HTTP Request: ${axiosConfig.method?.toUpperCase()} ${axiosConfig.url}`);
        return axiosConfig;
      },
      (error: unknown) => {
        this.logger.error('HTTP Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor: log and map errors
    this.client.interceptors.response.use(
      (response) => {
        this.logger.debug(`HTTP Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error: AxiosError) => {
        const apiError = ErrorMapper.mapAxiosError(error);
        this.logger.error('HTTP Response Error:', apiError);
        return Promise.reject(apiError);
      }
    );
  }

  /**
   * Единый приватный запрос с retry, возвращающий данные + заголовки.
   * На нём построены get/post (берут только .data) и
   * getWithResponse/postWithResponse (возвращают конверт целиком).
   *
   * ВАЖНО (пакет 1.1.E): метод и признак объявленной идемпотентности
   * прокидываются в `RetryHandler` явно. До фикса вызов шёл без `context`,
   * что для `RetryHandler.executeWithRetry` означало дефолт `{ method: 'get' }`
   * независимо от фактического метода — POST-запросы этого клиента повторялись
   * вслепую на 5xx/сеть/таймаут, как до пакета 1.1.C. Та же политика повтора,
   * что и в `AxiosHttpClient` (см. `IHttpClient.post` JSDoc).
   */
  private async requestWithResponse<T>(
    method: EnvelopeMethod,
    path: string,
    data?: unknown,
    params?: QueryParams,
    idempotencyDeclared?: boolean
  ): Promise<HttpResponseEnvelope<T>> {
    return this.retryHandler.executeWithRetry(
      async () => {
        const config: AxiosRequestConfig | undefined =
          params !== undefined ? { params } : undefined;

        const response =
          method === 'get'
            ? await this.client.get<T>(path, { params })
            : config
              ? await this.client.post<T>(path, data, config)
              : await this.client.post<T>(path, data);

        return { data: response.data, headers: normalizeHeaders(response.headers) };
      },
      {
        method,
        ...(idempotencyDeclared !== undefined && { idempotencyDeclared }),
      }
    );
  }

  /**
   * Execute GET request with retry logic
   *
   * @param path - API endpoint path
   * @param params - Optional query parameters
   */
  async get<T>(path: string, params?: QueryParams): Promise<T> {
    const { data } = await this.requestWithResponse<T>('get', path, undefined, params);
    return data;
  }

  /**
   * Execute POST request with retry logic
   *
   * ВНИМАНИЕ (retry, пакет 1.1.E): та же политика, что и в `AxiosHttpClient` —
   * POST повторяется на 5xx/сеть/таймаут только если `idempotencyDeclared: true`.
   * 429 повторяется всегда.
   *
   * @param path - API endpoint path
   * @param data - Request body data
   * @param idempotencyDeclared - объявить запрос идемпотентным для целей retry
   */
  async post<T = unknown>(path: string, data?: unknown, idempotencyDeclared?: boolean): Promise<T> {
    const { data: result } = await this.requestWithResponse<T>(
      'post',
      path,
      data,
      undefined,
      idempotencyDeclared
    );
    return result;
  }

  /**
   * GET с возвратом данных и заголовков ответа (для пагинации).
   */
  async getWithResponse<T>(path: string, params?: QueryParams): Promise<HttpResponseEnvelope<T>> {
    return this.requestWithResponse<T>('get', path, undefined, params);
  }

  /**
   * POST с возвратом данных и заголовков ответа (для пагинации).
   *
   * См. предупреждение про `idempotencyDeclared` в `post()` — та же retry-политика.
   */
  async postWithResponse<T = unknown>(
    path: string,
    data?: unknown,
    params?: QueryParams,
    idempotencyDeclared?: boolean
  ): Promise<HttpResponseEnvelope<T>> {
    return this.requestWithResponse<T>('post', path, data, params, idempotencyDeclared);
  }

  /**
   * Execute PATCH request with retry logic
   *
   * @param path - API endpoint path
   * @param data - Request body data
   */
  async patch<T = unknown>(path: string, data?: unknown): Promise<T> {
    return this.retryHandler.executeWithRetry(
      async () => {
        const response = await this.client.patch<T>(path, data);
        return response.data;
      },
      { method: 'patch' }
    );
  }

  /**
   * Execute DELETE request with retry logic
   *
   * @param path - API endpoint path
   * @param data - Optional request body data
   */
  async delete<T = unknown>(path: string, data?: unknown): Promise<T> {
    return this.retryHandler.executeWithRetry(
      async () => {
        const response = await this.client.delete<T>(path, { data });
        return response.data;
      },
      { method: 'delete' }
    );
  }

  /**
   * Get axios instance for advanced operations
   * @internal For testing purposes only
   */
  getAxiosInstance(): AxiosInstance {
    return this.client;
  }
}
