/**
 * HTTP Client интерфейс
 *
 * Определяет контракт для HTTP клиентов.
 * Реализации: AxiosHttpClient (production), MockHttpClient (tests)
 */

import type { QueryParams, HttpResponseEnvelope } from '../../types.js';

export interface IHttpClient {
  /**
   * Выполняет GET запрос
   * @param path - путь к ресурсу
   * @param params - опциональные query параметры
   * @returns данные ответа
   */
  get<T>(path: string, params?: QueryParams): Promise<T>;

  /**
   * Выполняет POST запрос
   *
   * ВНИМАНИЕ (retry): по умолчанию неидемпотентный POST при ошибке с
   * неопределённым исходом (сеть, таймаут, 5xx) НЕ повторяется — сервер мог
   * успеть выполнить запрос, повтор создал бы дубль. 429 повторяется всегда.
   * Если операция идемпотентна на уровне API (например, снабжена ключом
   * идемпотентности) — передайте `idempotencyDeclared: true`.
   *
   * @param path - путь к ресурсу
   * @param data - данные для отправки
   * @param idempotencyDeclared - объявить запрос идемпотентным для целей retry
   * @returns данные ответа
   */
  post<T = unknown>(path: string, data?: unknown, idempotencyDeclared?: boolean): Promise<T>;

  /**
   * Выполняет GET запрос и возвращает данные ВМЕСТЕ с заголовками ответа.
   *
   * Нужен для пагинации: заголовки `Link`, `X-Total-Count`, `X-Total-Pages`
   * недоступны через обычный `get` (он отдаёт только тело).
   *
   * @param path - путь к ресурсу
   * @param params - опциональные query параметры
   * @returns конверт `{ data, headers }`
   */
  getWithResponse<T>(path: string, params?: QueryParams): Promise<HttpResponseEnvelope<T>>;

  /**
   * Выполняет POST запрос и возвращает данные ВМЕСТЕ с заголовками ответа.
   *
   * Нужен для пагинации POST `_search` (seek: `Link`/`X-Total-*`).
   *
   * См. предупреждение про `idempotencyDeclared` в `post()` — та же retry-политика.
   *
   * @param path - путь к ресурсу
   * @param data - данные для отправки
   * @param params - опциональные query параметры
   * @param idempotencyDeclared - объявить запрос идемпотентным для целей retry
   * @returns конверт `{ data, headers }`
   */
  postWithResponse<T = unknown>(
    path: string,
    data?: unknown,
    params?: QueryParams,
    idempotencyDeclared?: boolean
  ): Promise<HttpResponseEnvelope<T>>;

  /**
   * Выполняет PATCH запрос
   * @param path - путь к ресурсу
   * @param data - данные для отправки
   * @returns данные ответа
   */
  patch<T = unknown>(path: string, data?: unknown): Promise<T>;

  /**
   * Выполняет DELETE запрос
   * @param path - путь к ресурсу
   * @param data - опциональные данные для отправки в body
   * @returns данные ответа
   */
  delete<T = unknown>(path: string, data?: unknown): Promise<T>;

  /**
   * Получить Axios instance (для специальных операций)
   * @internal Только для использования в операциях, требующих прямого доступа к Axios
   * @deprecated Используйте стандартные методы get/post/patch/delete где возможно
   */
  getAxiosInstance?(): unknown;
}
