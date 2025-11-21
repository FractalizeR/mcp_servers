/**
 * Преобразователь ошибок Axios в ApiErrorClass
 *
 * Ответственность (SRP):
 * - ТОЛЬКО преобразование AxiosError → ApiErrorClass
 * - ТОЛЬКО извлечение информации из ответа API
 * - Специальная обработка rate limiting (429)
 *
 * НЕ отвечает за:
 * - Retry логику (делегируется RetryHandler)
 * - Логирование (делегируется вызывающему коду)
 *
 * ОБНОВЛЕНО:
 * - Возвращает ApiErrorClass (extends Error) вместо plain ApiError
 * - Решает проблему потери деталей ошибки при передаче через Promise.reject()
 */

import type { AxiosError } from 'axios';
import { HttpStatusCode } from '../../types.js';
import { ApiErrorClass } from './api-error.class.js';

export class ErrorMapper {
  /**
   * Преобразует AxiosError в ApiErrorClass
   * @param error - ошибка Axios
   * @returns структурированная ошибка API (extends Error)
   */
  static mapAxiosError(error: AxiosError): ApiErrorClass {
    // Случай 1: Сервер вернул ответ с ошибкой
    if (error.response) {
      return this.mapResponseError(error);
    }

    // Случай 2: Запрос был отправлен, но нет ответа
    if (error.request) {
      return new ApiErrorClass(
        HttpStatusCode.NETWORK_ERROR,
        'Нет ответа от сервера. Проверьте подключение к интернету.'
      );
    }

    // Случай 3: Ошибка при настройке запроса
    return new ApiErrorClass(HttpStatusCode.NETWORK_ERROR, error.message || 'Неизвестная ошибка');
  }

  /**
   * Обрабатывает ошибку с ответом от сервера
   */
  private static mapResponseError(error: AxiosError): ApiErrorClass {
    const data = error.response?.data as Record<string, unknown> | undefined;

    if (!data || !error.response) {
      return new ApiErrorClass(error.response?.status ?? 0, error.message);
    }

    // Специальная обработка rate limiting (429 ошибка)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    if (error.response.status === HttpStatusCode.TOO_MANY_REQUESTS) {
      return this.mapRateLimitError(error);
    }

    // Извлекаем сообщение об ошибке из различных форматов ответа
    const errorMessages = data['errorMessages'] as string[] | undefined;
    const dataMessage = data['message'] as string | undefined;
    const message = (errorMessages?.[0]) ?? dataMessage ?? error.message;
    const errors = data['errors'] as Record<string, string[]> | undefined;

    return new ApiErrorClass(error.response.status, message, errors);
  }

  /**
   * Обрабатывает ошибку rate limiting (429)
   * Извлекает информацию о времени ожидания из заголовка Retry-After
   *
   * @param error - Axios ошибка с 429 статусом
   * @returns ApiErrorClass с обязательным retryAfter
   */
  private static mapRateLimitError(error: AxiosError): ApiErrorClass {
    const retryAfterHeader = error.response?.headers['retry-after'] as string | undefined;
    let retryAfter = 60; // Значение по умолчанию: 60 секунд

    if (retryAfterHeader && typeof retryAfterHeader === 'string') {
      const parsed = parseInt(retryAfterHeader, 10);
      if (!isNaN(parsed) && parsed > 0) {
        retryAfter = parsed;
      }
    }

    return new ApiErrorClass(
      HttpStatusCode.TOO_MANY_REQUESTS,
      `Rate limit exceeded. Retry after ${retryAfter} seconds.`,
      undefined,
      retryAfter
    );
  }
}
