/**
 * Базовый HTTP клиент (Axios wrapper)
 *
 * Ответственность (SRP):
 * - ТОЛЬКО конфигурация Axios instance
 * - ТОЛЬКО базовые HTTP методы (get, post, patch, delete)
 * - ТОЛЬКО добавление заголовков
 * - Логирование запросов/ответов через interceptors
 *
 * НЕ отвечает за:
 * - Retry логику (делегируется RetryHandler)
 * - Кеширование (делегируется CacheManager)
 * - Бизнес-логику API (делегируется Operations)
 */

import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';
import type { HttpConfig } from '@infrastructure/http/client/http-config.interface.js';
import type { Logger } from '@infrastructure/logging/index.js';
import type { QueryParams } from '@types';
import { ErrorMapper } from '@infrastructure/http/error';
import { RetryHandler } from '@infrastructure/http/retry';
import type { RetryStrategy } from '@infrastructure/http/retry';
import { ParallelExecutor } from '@infrastructure/async';
import type { BatchResult } from '@infrastructure/async';

export class HttpClient {
  private readonly client: AxiosInstance;
  private readonly logger: Logger;
  private readonly retryHandler: RetryHandler;
  private readonly parallelExecutor: ParallelExecutor;

  constructor(config: HttpConfig, logger: Logger, retryStrategy: RetryStrategy) {
    this.logger = logger;
    this.retryHandler = new RetryHandler(retryStrategy, logger);
    this.parallelExecutor = new ParallelExecutor(logger, {
      maxBatchSize: config.maxBatchSize,
      maxConcurrentRequests: config.maxConcurrentRequests,
    });

    // Формируем базовые заголовки
    const headers: Record<string, string> = {
      Authorization: `OAuth ${config.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    // Добавляем правильный заголовок в зависимости от типа организации
    if (config.orgId) {
      headers['X-Org-ID'] = config.orgId;
    } else if (config.cloudOrgId) {
      headers['X-Cloud-Org-ID'] = config.cloudOrgId;
    }

    // Создаём Axios instance с конфигурацией
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers,
    });

    // Настраиваем interceptors
    this.setupInterceptors();
  }

  /**
   * Настройка interceptors для логирования
   */
  private setupInterceptors(): void {
    // Interceptor для логирования запросов
    this.client.interceptors.request.use(
      (config) => {
        this.logger.debug(`HTTP Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('HTTP Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Interceptor для логирования ответов и преобразования ошибок
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
   * Выполняет GET запрос с retry логикой
   * @param path - путь к ресурсу
   * @param params - опциональные query параметры
   * @returns данные ответа
   */
  async get<T>(path: string, params?: QueryParams): Promise<T> {
    return this.retryHandler.executeWithRetry(async () => {
      const response = await this.client.get<T>(path, { params });
      return response.data;
    });
  }

  /**
   * Выполняет POST запрос с retry логикой
   * @param path - путь к ресурсу
   * @param data - данные для отправки
   * @returns данные ответа
   */
  async post<T = unknown>(path: string, data?: unknown): Promise<T> {
    return this.retryHandler.executeWithRetry(async () => {
      const response = await this.client.post<T>(path, data);
      return response.data;
    });
  }

  /**
   * Выполняет PATCH запрос с retry логикой
   * @param path - путь к ресурсу
   * @param data - данные для отправки
   * @returns данные ответа
   */
  async patch<T = unknown>(path: string, data?: unknown): Promise<T> {
    return this.retryHandler.executeWithRetry(async () => {
      const response = await this.client.patch<T>(path, data);
      return response.data;
    });
  }

  /**
   * Выполняет DELETE запрос с retry логикой
   * @param path - путь к ресурсу
   * @returns данные ответа
   */
  async delete<T = unknown>(path: string): Promise<T> {
    return this.retryHandler.executeWithRetry(async () => {
      const response = await this.client.delete<T>(path);
      return response.data;
    });
  }

  // ============================================================================
  // Пакетные методы (с параллельным выполнением и retry на уровне запроса)
  // ============================================================================

  /**
   * Выполняет множественные GET запросы параллельно
   * Каждый запрос независимо ретраится согласно стратегии
   *
   * @param paths - массив путей к ресурсам
   * @param params - опциональные query параметры (общие для всех запросов)
   * @returns агрегированный результат всех запросов
   *
   * @example
   * // Получение нескольких задач параллельно
   * const result = await httpClient.getBatch([
   *   '/v3/issues/QUEUE-1',
   *   '/v3/issues/QUEUE-2',
   *   '/v3/issues/QUEUE-3'
   * ]);
   *
   * // Проверка успешности (используя статические методы ParallelExecutor)
   * if (ParallelExecutor.isAllSuccess(result)) {
   *   const issues = ParallelExecutor.getSuccessfulResults(result);
   * } else {
   *   const errors = ParallelExecutor.getErrors(result);
   * }
   */
  async getBatch<T>(paths: string[], params?: QueryParams): Promise<BatchResult<T>> {
    const operations = paths.map((path) => this.createRetryableGetOperation<T>(path, params));

    return this.parallelExecutor.executeParallel(operations, 'GET batch');
  }

  /**
   * Выполняет множественные POST запросы параллельно
   * Каждый запрос независимо ретраится согласно стратегии
   *
   * @param requests - массив объектов {path, data}
   * @returns агрегированный результат всех запросов
   *
   * @example
   * const result = await httpClient.postBatch([
   *   { path: '/v3/issues', data: { queue: 'PROJ', summary: 'Issue 1' } },
   *   { path: '/v3/issues', data: { queue: 'PROJ', summary: 'Issue 2' } }
   * ]);
   */
  async postBatch<T = unknown>(
    requests: Array<{ path: string; data?: unknown }>
  ): Promise<BatchResult<T>> {
    const operations = requests.map((req) =>
      this.createRetryablePostOperation<T>(req.path, req.data)
    );

    return this.parallelExecutor.executeParallel(operations, 'POST batch');
  }

  /**
   * Выполняет множественные PATCH запросы параллельно
   * Каждый запрос независимо ретраится согласно стратегии
   *
   * @param requests - массив объектов {path, data}
   * @returns агрегированный результат всех запросов
   *
   * @example
   * const result = await httpClient.patchBatch([
   *   { path: '/v3/issues/QUEUE-1', data: { summary: 'Updated 1' } },
   *   { path: '/v3/issues/QUEUE-2', data: { summary: 'Updated 2' } }
   * ]);
   */
  async patchBatch<T = unknown>(
    requests: Array<{ path: string; data?: unknown }>
  ): Promise<BatchResult<T>> {
    const operations = requests.map((req) =>
      this.createRetryablePatchOperation<T>(req.path, req.data)
    );

    return this.parallelExecutor.executeParallel(operations, 'PATCH batch');
  }

  /**
   * Выполняет множественные DELETE запросы параллельно
   * Каждый запрос независимо ретраится согласно стратегии
   *
   * @param paths - массив путей к ресурсам
   * @returns агрегированный результат всех запросов
   *
   * @example
   * const result = await httpClient.deleteBatch([
   *   '/v3/issues/QUEUE-1',
   *   '/v3/issues/QUEUE-2'
   * ]);
   */
  async deleteBatch<T = unknown>(paths: string[]): Promise<BatchResult<T>> {
    const operations = paths.map((path) => this.createRetryableDeleteOperation<T>(path));

    return this.parallelExecutor.executeParallel(operations, 'DELETE batch');
  }

  // ============================================================================
  // Приватные helper-методы для создания "ленивых" операций с retry логикой
  // ============================================================================

  /**
   * Создает "ленивую" GET операцию с retry логикой
   * @private
   */
  private createRetryableGetOperation<T>(path: string, params?: QueryParams): () => Promise<T> {
    return () => this.retryHandler.executeWithRetry(() => this.get<T>(path, params));
  }

  /**
   * Создает "ленивую" POST операцию с retry логикой
   * @private
   */
  private createRetryablePostOperation<T>(path: string, data?: unknown): () => Promise<T> {
    return () => this.retryHandler.executeWithRetry(() => this.post<T>(path, data));
  }

  /**
   * Создает "ленивую" PATCH операцию с retry логикой
   * @private
   */
  private createRetryablePatchOperation<T>(path: string, data?: unknown): () => Promise<T> {
    return () => this.retryHandler.executeWithRetry(() => this.patch<T>(path, data));
  }

  /**
   * Создает "ленивую" DELETE операцию с retry логикой
   * @private
   */
  private createRetryableDeleteOperation<T>(path: string): () => Promise<T> {
    return () => this.retryHandler.executeWithRetry(() => this.delete<T>(path));
  }
}
