/**
 * HTTP Client интерфейс
 *
 * Определяет контракт для HTTP клиентов.
 * Реализации: AxiosHttpClient (production), MockHttpClient (tests)
 */

import type { QueryParams } from '../../types.js';

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
   * @param path - путь к ресурсу
   * @param data - данные для отправки
   * @returns данные ответа
   */
  post<T = unknown>(path: string, data?: unknown): Promise<T>;

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
