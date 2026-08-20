/**
 * Axios-based HTTP клиент
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
import type { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import type { HttpConfig } from './http-config.interface.js';
import type { HttpTrafficGuard, OutgoingRequest } from './http-traffic-guard.interface.js';
import type { IHttpClient } from './i-http-client.interface.js';
import type { Logger } from '../../logging/index.js';
import type { QueryParams, HttpResponseEnvelope } from '../../types.js';
import { ErrorMapper, ScopeViolationError } from '../error/index.js';
import { normalizeHeaders } from '../response/index.js';
import { RetryHandler } from '../retry/index.js';
import type { RetryStrategy, RetryContext } from '../retry/index.js';

/** HTTP-методы, поддерживающие возврат конверта с заголовками. */
type EnvelopeMethod = 'get' | 'post';

/** Приводит конфиг axios к виду, в котором запрос видит guard. */
function describeRequest(config: {
  method?: string | undefined;
  url?: string | undefined;
  data?: unknown;
}): OutgoingRequest {
  return { method: (config.method ?? '').toLowerCase(), url: config.url ?? '', data: config.data };
}

export class AxiosHttpClient implements IHttpClient {
  private readonly client: AxiosInstance;
  private readonly logger: Logger;
  private readonly retryHandler: RetryHandler;
  private readonly trafficGuard: HttpTrafficGuard | undefined;

  constructor(config: HttpConfig, logger: Logger, retryStrategy: RetryStrategy) {
    this.logger = logger;
    this.trafficGuard = config.trafficGuard;
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

    // Создаём Axios instance с конфигурацией.
    //
    // maxRedirects под guard: переход по редиректу выполняет http-адаптер, минуя
    // request-интерцептор, — рубеж не увидел бы конечного адреса и решал бы по
    // исходному. Поймано ревью; без guard поведение прежнее.
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers,
      ...(config.trafficGuard && { maxRedirects: 0 }),
    });

    // Настраиваем interceptors
    this.setupInterceptors();
  }

  /**
   * Настройка interceptors для логирования
   */
  private setupInterceptors(): void {
    // Interceptor для логирования запросов и надзора за областью действия.
    // Guard стоит здесь, а не в методах класса: операции с multipart и бинарными
    // телами берут axios instance напрямую (`getAxiosInstance()`) и рубеж на уровне
    // методов их не увидел бы.
    this.client.interceptors.request.use(
      (config) => {
        this.logger.debug(`HTTP Request: ${config.method?.toUpperCase()} ${config.url}`);
        this.trafficGuard?.inspectRequest(describeRequest(config));
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
        this.trafficGuard?.observeResponse({
          request: describeRequest(response.config),
          status: response.status,
          data: response.data,
        });
        return response;
      },
      (error: AxiosError) => {
        // Отказ собственного рубежа проходит насквозь: ErrorMapper отнёс бы его
        // к сетевым ошибкам (запроса не было — значит «нет ответа от сервера»),
        // и отказ стал бы повторяемым и неотличимым от сбоя сети.
        if (error instanceof ScopeViolationError) {
          this.logger.error('Запрос отклонён надзором за областью действия:', error);
          return Promise.reject(error);
        }
        const apiError = ErrorMapper.mapAxiosError(error);
        this.logger.error('HTTP Response Error:', apiError);
        return Promise.reject(apiError);
      }
    );
  }

  /**
   * Единый приватный запрос с retry, возвращающий данные + нормализованные
   * заголовки. На нём построены и `get/post` (берут только `.data`),
   * и `getWithResponse/postWithResponse` (возвращают конверт целиком).
   *
   * @param method - HTTP-метод (get | post)
   * @param path - путь к ресурсу
   * @param options - тело запроса, query-параметры и признак объявленной
   *   идемпотентности (см. `idempotencyDeclared` в JSDoc `post()`)
   * @returns конверт `{ data, headers }`
   */
  private async requestWithResponse<T>(
    method: EnvelopeMethod,
    path: string,
    options: {
      data?: unknown;
      params?: QueryParams | undefined;
      idempotencyDeclared?: boolean | undefined;
    } = {}
  ): Promise<HttpResponseEnvelope<T>> {
    const { data, params, idempotencyDeclared } = options;
    const context: RetryContext = {
      method,
      ...(idempotencyDeclared !== undefined && { idempotencyDeclared }),
    };

    return this.retryHandler.executeWithRetry(async () => {
      // config передаём в POST только при наличии params, чтобы сохранить
      // обратную совместимость вызова this.client.post(path, data).
      const config: AxiosRequestConfig | undefined = params !== undefined ? { params } : undefined;

      const response =
        method === 'get'
          ? await this.client.get<T>(path, { params })
          : config
            ? await this.client.post<T>(path, data, config)
            : await this.client.post<T>(path, data);

      return { data: response.data, headers: normalizeHeaders(response.headers) };
    }, context);
  }

  /**
   * Выполняет GET запрос с retry логикой
   * @param path - путь к ресурсу
   * @param params - опциональные query параметры
   * @returns данные ответа
   */
  async get<T>(path: string, params?: QueryParams): Promise<T> {
    const { data } = await this.requestWithResponse<T>('get', path, { params });
    return data;
  }

  /**
   * Выполняет POST запрос с retry логикой.
   *
   * ВНИМАНИЕ: по умолчанию POST повторяется только на 429 (сервер сам просит
   * повторить — запрос заведомо не выполнялся). На сетевых ошибках/таймаутах/
   * 5xx повтор ОТКЛЮЧЁН, чтобы не создать дубль на уже выполненном запросе.
   * Если операция объявлена идемпотентной на уровне API (например, отправлен
   * ключ идемпотентности) — передайте `idempotencyDeclared: true`.
   *
   * @param path - путь к ресурсу
   * @param data - данные для отправки
   * @param idempotencyDeclared - объявить запрос идемпотентным для целей retry
   * @returns данные ответа
   */
  async post<T = unknown>(path: string, data?: unknown, idempotencyDeclared?: boolean): Promise<T> {
    const { data: result } = await this.requestWithResponse<T>('post', path, {
      data,
      idempotencyDeclared,
    });
    return result;
  }

  /**
   * GET с возвратом данных и заголовков ответа (для пагинации).
   */
  async getWithResponse<T>(path: string, params?: QueryParams): Promise<HttpResponseEnvelope<T>> {
    return this.requestWithResponse<T>('get', path, { params });
  }

  /**
   * POST с возвратом данных и заголовков ответа (для пагинации `_search`).
   *
   * См. предупреждение в `post()` про `idempotencyDeclared` — та же политика
   * повтора применяется и здесь.
   */
  async postWithResponse<T = unknown>(
    path: string,
    data?: unknown,
    params?: QueryParams,
    idempotencyDeclared?: boolean
  ): Promise<HttpResponseEnvelope<T>> {
    return this.requestWithResponse<T>('post', path, { data, params, idempotencyDeclared });
  }

  /**
   * Выполняет PATCH запрос с retry логикой
   * @param path - путь к ресурсу
   * @param data - данные для отправки
   * @returns данные ответа
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
   * Выполняет DELETE запрос с retry логикой
   * @param path - путь к ресурсу
   * @param data - опциональные данные для body
   * @returns данные ответа
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
   * Получить axios instance (для тестов)
   * @internal Только для использования в интеграционных тестах
   */
  getAxiosInstance(): AxiosInstance {
    return this.client;
  }
}
