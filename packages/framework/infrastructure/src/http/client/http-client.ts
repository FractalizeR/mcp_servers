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
import type { HttpConfig } from './http-config.interface.js';
import type { Logger } from '../../logging/index.js';
import type { QueryParams } from '../../types.js';
import { ErrorMapper } from '../error/index.js';
import { RetryHandler } from '../retry/index.js';
import type { RetryStrategy } from '../retry/index.js';

export class HttpClient {
  private readonly client: AxiosInstance;
  private readonly logger: Logger;
  private readonly retryHandler: RetryHandler;

  constructor(config: HttpConfig, logger: Logger, retryStrategy: RetryStrategy) {
    this.logger = logger;
    this.retryHandler = new RetryHandler(retryStrategy, logger);

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

  /**
   * Получить axios instance (для тестов)
   * @internal Только для использования в интеграционных тестах
   */
  getAxiosInstance(): AxiosInstance {
    return this.client;
  }
}
