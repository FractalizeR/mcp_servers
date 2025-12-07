/**
 * Authenticated HTTP Client for TickTick API
 *
 * Wraps base HTTP operations and adds Bearer token authentication.
 * Automatically refreshes tokens via OAuth client when needed.
 */

import axios from 'axios';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { IHttpClient, QueryParams, RetryStrategy } from '@mcp-framework/infrastructure';
import { RetryHandler, ErrorMapper } from '@mcp-framework/infrastructure';
import type { Logger } from '@mcp-framework/infrastructure';
import type { TickTickOAuthClient } from '../auth/oauth-client.js';

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
   * Execute GET request with retry logic
   *
   * @param path - API endpoint path
   * @param params - Optional query parameters
   */
  async get<T>(path: string, params?: QueryParams): Promise<T> {
    return this.retryHandler.executeWithRetry(async () => {
      const response = await this.client.get<T>(path, { params });
      return response.data;
    });
  }

  /**
   * Execute POST request with retry logic
   *
   * @param path - API endpoint path
   * @param data - Request body data
   */
  async post<T = unknown>(path: string, data?: unknown): Promise<T> {
    return this.retryHandler.executeWithRetry(async () => {
      const response = await this.client.post<T>(path, data);
      return response.data;
    });
  }

  /**
   * Execute PATCH request with retry logic
   *
   * @param path - API endpoint path
   * @param data - Request body data
   */
  async patch<T = unknown>(path: string, data?: unknown): Promise<T> {
    return this.retryHandler.executeWithRetry(async () => {
      const response = await this.client.patch<T>(path, data);
      return response.data;
    });
  }

  /**
   * Execute DELETE request with retry logic
   *
   * @param path - API endpoint path
   * @param data - Optional request body data
   */
  async delete<T = unknown>(path: string, data?: unknown): Promise<T> {
    return this.retryHandler.executeWithRetry(async () => {
      const response = await this.client.delete<T>(path, { data });
      return response.data;
    });
  }

  /**
   * Get axios instance for advanced operations
   * @internal For testing purposes only
   */
  getAxiosInstance(): AxiosInstance {
    return this.client;
  }
}
