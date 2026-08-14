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

import type { RetryStrategy, RetryContext } from './retry-strategy.interface.js';
import type { Logger } from '../../logging/index.js';
import type { ApiError } from '../../types.js';
import { HttpStatusCode } from '../../types.js';

export class RetryHandler {
  constructor(
    private readonly strategy: RetryStrategy,
    private readonly logger: Logger
  ) {}

  /**
   * Выполняет переданную функцию с retry логикой
   * @param fn - асинхронная функция для выполнения
   * @param context - метод запроса и признак объявленной идемпотентности (нужен
   *   стратегии). Не передан — по умолчанию `{ method: 'get' }`, что для
   *   `ExponentialBackoffStrategy` воспроизводит прежнее (до пакета 1.1.C)
   *   поведение «повторяем любой метод по статус-коду» — так остаются
   *   обратно совместимы вызывающие вне AxiosHttpClient/MockHttpClient
   *   (например, независимые реализации `IHttpClient` в других серверах),
   *   которые ещё не объявляют метод запроса явно.
   * @param attempt - номер текущей попытки (для внутреннего использования)
   * @returns результат выполнения функции
   * @throws ApiError если все попытки исчерпаны или ошибка не повторяемая
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    context: RetryContext = { method: 'get' },
    attempt: number = 0
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const apiError = error as ApiError;

      // Проверяем, нужно ли повторять запрос
      if (!this.strategy.shouldRetry(context, apiError, attempt)) {
        this.logRetryRefusal(context, apiError, attempt);
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
      return this.executeWithRetry(fn, context, attempt + 1);
    }
  }

  /**
   * Логирует причину отказа от повтора (и, при отказе от повтора
   * неидемпотентного POST с неопределённым исходом, дописывает в сообщение
   * ошибки предупреждение о возможном выполнении операции на сервере).
   */
  private logRetryRefusal(context: RetryContext, error: ApiError, attempt: number): void {
    if (attempt >= this.strategy.maxRetries) {
      this.logger.warn(
        `Достигнут максимум попыток (${this.strategy.maxRetries}). Ошибка: ${error.message}`
      );
      return;
    }

    if (!this.isRefusedNonIdempotentPost(context, error)) {
      this.logger.debug(`Ошибка ${error.statusCode} не является повторяемой. Отказ от retry.`);
      return;
    }

    // Отказ от повтора именно из-за небезопасности повтора POST (не из-за
    // изначально неповторяемого статуса) — исход запроса неопределён,
    // операция могла быть выполнена на сервере.
    const warning =
      `POST-запрос завершился ошибкой ${error.statusCode} с неопределённым исходом. ` +
      `Повтор отключён, чтобы не создать дубль (задача/комментарий/массовая операция могли ` +
      `уже быть выполнены на сервере). Проверьте состояние ресурса в API перед повторной отправкой.`;
    this.logger.warn(warning);
    // ApiError.message типизирован как readonly, но по факту объект — Error
    // (message доступен для записи в рантайме). Дописываем подсказку, чтобы
    // она дошла до агента вместе с исходным текстом ошибки.
    (error as { message: string }).message = `${error.message} ${warning}`;
  }

  /**
   * Был ли повтор отклонён именно из-за небезопасности повтора неидемпотентного
   * POST (а не потому, что статус в принципе неповторяем, например 400/404).
   */
  private isRefusedNonIdempotentPost(context: RetryContext, error: ApiError): boolean {
    return (
      context.method === 'post' &&
      context.idempotencyDeclared !== true &&
      error.statusCode !== HttpStatusCode.TOO_MANY_REQUESTS &&
      this.strategy.isOutcomeAmbiguous(error)
    );
  }

  /**
   * Задержка выполнения (sleep)
   * @param ms - время задержки в миллисекундах
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
