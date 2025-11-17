/**
 * Преобразователь ошибок Axios в ApiError
 *
 * Ответственность (SRP):
 * - ТОЛЬКО преобразование AxiosError → ApiError
 * - ТОЛЬКО извлечение информации из ответа API
 * - Специальная обработка rate limiting (429)
 *
 * НЕ отвечает за:
 * - Retry логику (делегируется RetryHandler)
 * - Логирование (делегируется вызывающему коду)
 */

import type { AxiosError } from 'axios';
import type { ApiError } from '../../types.js';
import { HttpStatusCode } from '../../types.js';

export class ErrorMapper {
  /**
   * Преобразует AxiosError в ApiError
   * @param error - ошибка Axios
   * @returns структурированная ошибка API
   */
  static mapAxiosError(error: AxiosError): ApiError {
    // Случай 1: Сервер вернул ответ с ошибкой
    if (error.response) {
      return this.mapResponseError(error);
    }

    // Случай 2: Запрос был отправлен, но нет ответа
    if (error.request) {
      return {
        statusCode: HttpStatusCode.NETWORK_ERROR,
        message: 'Нет ответа от сервера. Проверьте подключение к интернету.',
      };
    }

    // Случай 3: Ошибка при настройке запроса
    return {
      statusCode: HttpStatusCode.NETWORK_ERROR,
      message: error.message || 'Неизвестная ошибка',
    };
  }

  /**
   * Обрабатывает ошибку с ответом от сервера
   */
  private static mapResponseError(error: AxiosError): ApiError {
    const data = error.response?.data as Record<string, unknown> | undefined;

    if (!data || !error.response) {
      return {
        statusCode: error.response?.status ?? 0,
        message: error.message,
      };
    }

    // Специальная обработка rate limiting (429 ошибка)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    if (error.response.status === HttpStatusCode.TOO_MANY_REQUESTS) {
      return this.mapRateLimitError(error);
    }

    // Извлекаем сообщение об ошибке из различных форматов ответа
    // Используем || для fallback chain (пропускаем пустые строки из API)
    const errorMessages = data['errorMessages'] as string[] | undefined;
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const message = errorMessages?.[0] || (data['message'] as string) || error.message;
    const errors = data['errors'] as Record<string, string[]> | undefined;

    return {
      statusCode: error.response.status,
      message,
      ...(errors && { errors }),
    };
  }

  /**
   * Обрабатывает ошибку rate limiting (429)
   * Извлекает информацию о времени ожидания из заголовка Retry-After
   *
   * @param error - Axios ошибка с 429 статусом
   * @returns ApiError с обязательным retryAfter
   */
  private static mapRateLimitError(error: AxiosError): ApiError {
    const retryAfterHeader = error.response?.headers['retry-after'] as string | undefined;
    let retryAfter = 60; // Значение по умолчанию: 60 секунд

    if (retryAfterHeader && typeof retryAfterHeader === 'string') {
      const parsed = parseInt(retryAfterHeader, 10);
      if (!isNaN(parsed) && parsed > 0) {
        retryAfter = parsed;
      }
    }

    return {
      statusCode: HttpStatusCode.TOO_MANY_REQUESTS,
      message: `Rate limit exceeded. Retry after ${retryAfter} seconds.`,
      retryAfter,
    };
  }
}
