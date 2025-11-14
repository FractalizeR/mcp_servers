/**
 * Оркестратор retry логики
 *
 * Ответственность (SRP):
 * - ТОЛЬКО выполнение retry логики
 * - ТОЛЬКО логирование попыток
 * - Делегирование решений стратегии (shouldRetry, getDelay)
 *
 * НЕ отвечает за:
 * - Вычисление задержки (делегируется RetryStrategy)
 * - HTTP запросы (принимает готовую функцию)
 */

import type { RetryStrategy } from '@infrastructure/http/retry/retry-strategy.interface.js';
import type { Logger } from '@infrastructure/logging/index.js';
import type { ApiError } from '@types';

export class RetryHandler {
  constructor(
    private readonly strategy: RetryStrategy,
    private readonly logger: Logger
  ) {}

  /**
   * Выполняет переданную функцию с retry логикой
   * @param fn - асинхронная функция для выполнения
   * @param attempt - номер текущей попытки (для внутреннего использования)
   * @returns результат выполнения функции
   * @throws ApiError если все попытки исчерпаны или ошибка не повторяемая
   */
  async executeWithRetry<T>(fn: () => Promise<T>, attempt: number = 0): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const apiError = error as ApiError;

      // Проверяем, нужно ли повторять запрос
      if (!this.strategy.shouldRetry(apiError, attempt)) {
        // Логируем причину отказа от повтора
        if (attempt >= this.strategy.maxRetries) {
          this.logger.warn(
            `Достигнут максимум попыток (${this.strategy.maxRetries}). Ошибка: ${apiError.message}`
          );
        } else {
          this.logger.debug(
            `Ошибка ${apiError.statusCode} не является повторяемой. Отказ от retry.`
          );
        }

        throw apiError;
      }

      // Вычисляем задержку перед следующей попыткой
      const delayMs = this.strategy.getDelay(attempt, apiError);

      // Логируем информацию о повторе
      this.logger.warn(
        `Попытка ${attempt + 1}/${this.strategy.maxRetries} не удалась. ` +
          `Ошибка: ${apiError.message} (код: ${apiError.statusCode}). ` +
          `Ожидание ${delayMs}ms перед повтором...`
      );

      // Ждём перед следующей попыткой
      await this.delay(delayMs);

      // Рекурсивно повторяем запрос
      return this.executeWithRetry(fn, attempt + 1);
    }
  }

  /**
   * Задержка выполнения (sleep)
   * @param ms - время задержки в миллисекундах
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
