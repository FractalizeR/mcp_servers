/**
 * Mock HTTP Client для тестирования
 *
 * Простая реализация IHttpClient для unit/integration тестов.
 * Позволяет настраивать ответы (включая заголовки и мульти-страничные
 * последовательности) для разных запросов.
 */

import type { IHttpClient } from './i-http-client.interface.js';
import type { QueryParams, HttpResponseEnvelope, ResponseHeaders } from '../../types.js';

/** Один сконфигурированный мок-ответ: тело + заголовки. */
interface MockEntry {
  data: unknown;
  headers: ResponseHeaders;
}

export class MockHttpClient implements IHttpClient {
  /**
   * Очередь ответов на ключ `METHOD:path`.
   *
   * Семантика FIFO со «залипанием» последнего элемента: пока в очереди >1
   * ответа — каждый запрос забирает следующий; когда остаётся 1 — он
   * возвращается на все последующие запросы (поведение одиночного setResponse).
   */
  private responses: Map<string, MockEntry[]> = new Map();
  private requestHistory: Array<{
    method: string;
    path: string;
    data?: unknown;
    params?: QueryParams;
  }> = [];

  /**
   * Установить мок-ответ для конкретного пути (перезаписывает очередь).
   * @param method - HTTP метод
   * @param path - путь запроса
   * @param response - данные ответа
   * @param headers - опциональные заголовки ответа (для пагинации: `link`, `x-total-count`, ...)
   */
  setResponse<T>(method: string, path: string, response: T, headers?: ResponseHeaders): void {
    const key = `${method.toUpperCase()}:${path}`;
    this.responses.set(key, [{ data: response, headers: this.normalize(headers) }]);
  }

  /**
   * Установить ПОСЛЕДОВАТЕЛЬНОСТЬ ответов для пути (FIFO) — для тестов
   * мульти-страничной пагинации (включая POST `_search` на тот же путь).
   *
   * @param method - HTTP метод
   * @param path - путь запроса
   * @param pages - страницы по порядку; каждая — `{ data, headers? }`
   */
  setResponseQueue<T>(
    method: string,
    path: string,
    pages: Array<{ data: T; headers?: ResponseHeaders }>
  ): void {
    const key = `${method.toUpperCase()}:${path}`;
    this.responses.set(
      key,
      pages.map((page) => ({ data: page.data, headers: this.normalize(page.headers) }))
    );
  }

  /**
   * Получить историю запросов
   */
  getRequestHistory(): Array<{
    method: string;
    path: string;
    data?: unknown;
    params?: QueryParams;
  }> {
    return [...this.requestHistory];
  }

  /**
   * Очистить историю запросов
   */
  clearHistory(): void {
    this.requestHistory = [];
  }

  /**
   * Очистить все мок-ответы
   */
  clearResponses(): void {
    this.responses.clear();
  }

  get<T>(path: string, params?: QueryParams): Promise<T> {
    this.requestHistory.push({ method: 'GET', path, ...(params && { params }) });
    return this.resolve('GET', path).then((entry) => entry.data as T);
  }

  post<T = unknown>(path: string, data?: unknown): Promise<T> {
    this.requestHistory.push({ method: 'POST', path, data });
    return this.resolve('POST', path).then((entry) => entry.data as T);
  }

  patch<T = unknown>(path: string, data?: unknown): Promise<T> {
    this.requestHistory.push({ method: 'PATCH', path, data });
    return this.resolve('PATCH', path).then((entry) => entry.data as T);
  }

  delete<T = unknown>(path: string, _data?: unknown): Promise<T> {
    this.requestHistory.push({ method: 'DELETE', path });
    return this.resolve('DELETE', path).then((entry) => entry.data as T);
  }

  getWithResponse<T>(path: string, params?: QueryParams): Promise<HttpResponseEnvelope<T>> {
    this.requestHistory.push({ method: 'GET', path, ...(params && { params }) });
    return this.resolve('GET', path).then((entry) => ({
      data: entry.data as T,
      headers: entry.headers,
    }));
  }

  postWithResponse<T = unknown>(
    path: string,
    data?: unknown,
    params?: QueryParams
  ): Promise<HttpResponseEnvelope<T>> {
    this.requestHistory.push({ method: 'POST', path, data, ...(params && { params }) });
    return this.resolve('POST', path).then((entry) => ({
      data: entry.data as T,
      headers: entry.headers,
    }));
  }

  /**
   * Забрать следующий ответ из очереди по ключу `METHOD:path`.
   * Последний элемент «залипает» (возвращается повторно).
   */
  private resolve(method: string, path: string): Promise<MockEntry> {
    const key = `${method}:${path}`;
    const queue = this.responses.get(key);

    if (!queue || queue.length === 0) {
      return Promise.reject(new Error(`No mock response configured for ${method} ${path}`));
    }

    const entry = queue.length > 1 ? queue.shift() : queue[0];
    if (!entry) {
      return Promise.reject(new Error(`No mock response configured for ${method} ${path}`));
    }
    return Promise.resolve(entry);
  }

  private normalize(headers?: ResponseHeaders): ResponseHeaders {
    const result: ResponseHeaders = {};
    if (!headers) {
      return result;
    }
    for (const [key, value] of Object.entries(headers)) {
      result[key.toLowerCase()] = value;
    }
    return result;
  }
}
