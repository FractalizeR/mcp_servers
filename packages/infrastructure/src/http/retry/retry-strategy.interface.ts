/**
 * Интерфейс стратегии повтора запросов
 *
 * Ответственность (SRP):
 * - Определение, нужно ли повторять запрос
 * - Вычисление задержки перед следующей попыткой
 */

import type { ApiError } from '../../types.js';

export interface RetryStrategy {
  /**
   * Определяет, нужно ли повторять запрос при данной ошибке
   * @param error - ошибка API
   * @param attempt - номер текущей попытки (начиная с 0)
   * @returns true, если запрос нужно повторить
   */
  shouldRetry(error: ApiError, attempt: number): boolean;

  /**
   * Вычисляет задержку перед следующей попыткой (в миллисекундах)
   * @param attempt - номер текущей попытки (начиная с 0)
   * @param error - опциональная ошибка (для специальной обработки, например 429)
   * @returns задержка в миллисекундах
   */
  getDelay(attempt: number, error?: ApiError): number;

  /**
   * Максимальное количество попыток
   */
  readonly maxRetries: number;
}
