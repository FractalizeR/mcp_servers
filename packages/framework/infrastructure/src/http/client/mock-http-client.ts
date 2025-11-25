/**
 * Mock HTTP Client для тестирования
 *
 * Простая реализация IHttpClient для unit/integration тестов.
 * Позволяет настраивать ответы для разных запросов.
 */

import type { IHttpClient } from './i-http-client.interface.js';
import type { QueryParams } from '../../types.js';

export class MockHttpClient implements IHttpClient {
  private responses: Map<string, unknown> = new Map();
  private requestHistory: Array<{
    method: string;
    path: string;
    data?: unknown;
    params?: QueryParams;
  }> = [];

  /**
   * Установить мок-ответ для конкретного пути
   * @param method - HTTP метод
   * @param path - путь запроса
   * @param response - данные ответа
   */
  setResponse<T>(method: string, path: string, response: T): void {
    const key = `${method.toUpperCase()}:${path}`;
    this.responses.set(key, response);
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
    const key = `GET:${path}`;
    const response = this.responses.get(key);

    if (response === undefined) {
      return Promise.reject(new Error(`No mock response configured for GET ${path}`));
    }

    return Promise.resolve(response as T);
  }

  post<T = unknown>(path: string, data?: unknown): Promise<T> {
    this.requestHistory.push({ method: 'POST', path, data });
    const key = `POST:${path}`;
    const response = this.responses.get(key);

    if (response === undefined) {
      return Promise.reject(new Error(`No mock response configured for POST ${path}`));
    }

    return Promise.resolve(response as T);
  }

  patch<T = unknown>(path: string, data?: unknown): Promise<T> {
    this.requestHistory.push({ method: 'PATCH', path, data });
    const key = `PATCH:${path}`;
    const response = this.responses.get(key);

    if (response === undefined) {
      return Promise.reject(new Error(`No mock response configured for PATCH ${path}`));
    }

    return Promise.resolve(response as T);
  }

  delete<T = unknown>(path: string, _data?: unknown): Promise<T> {
    this.requestHistory.push({ method: 'DELETE', path });
    const key = `DELETE:${path}`;
    const response = this.responses.get(key);

    if (response === undefined) {
      return Promise.reject(new Error(`No mock response configured for DELETE ${path}`));
    }

    return Promise.resolve(response as T);
  }
}
