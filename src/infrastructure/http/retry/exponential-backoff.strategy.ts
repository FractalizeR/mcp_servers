/**
 * Стратегия повтора с экспоненциальным увеличением задержки (Exponential Backoff)
 *
 * Ответственность (SRP):
 * - ТОЛЬКО вычисление задержки по экспоненциальному алгоритму
 * - ТОЛЬКО определение повторяемых ошибок
 * - НЕТ логики выполнения запросов
 * - НЕТ логирования
 *
 * Алгоритм:
 * - delay = baseDelay * 2^attempt
 * - Ограничение: не более maxDelay
 * - Специальная обработка 429 (rate limiting): используется retryAfter из заголовка
 */

import type { RetryStrategy } from '@infrastructure/http/retry/retry-strategy.interface.js';
import type { ApiError } from '@types';
import { HttpStatusCode } from '@types';

export class ExponentialBackoffStrategy implements RetryStrategy {
  readonly maxRetries: number;
  private readonly baseDelay: number;
  private readonly maxDelay: number;

  /**
   * @param maxRetries - максимальное количество попыток (по умолчанию 3)
   * @param baseDelayMs - базовая задержка в миллисекундах (по умолчанию 1000)
   * @param maxDelayMs - максимальная задержка в миллисекундах (по умолчанию 10000)
   */
  constructor(
    maxRetries: number = 3,
    baseDelayMs: number = 1000,
    maxDelayMs: number = 10000
  ) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelayMs;
    this.maxDelay = maxDelayMs;
  }

  shouldRetry(error: ApiError, attempt: number): boolean {
    // Проверка лимита попыток
    if (attempt >= this.maxRetries) {
      return false;
    }

    // Список повторяемых статус-кодов (используем enum для типобезопасности)
    const retryableStatusCodes: HttpStatusCode[] = [
      HttpStatusCode.NETWORK_ERROR,         // 0: нет ответа от сервера
      HttpStatusCode.REQUEST_TIMEOUT,       // 408: Request Timeout
      HttpStatusCode.TOO_MANY_REQUESTS,     // 429: Rate Limiting
      HttpStatusCode.INTERNAL_SERVER_ERROR, // 500: Internal Server Error
      HttpStatusCode.BAD_GATEWAY,           // 502: Bad Gateway
      HttpStatusCode.SERVICE_UNAVAILABLE,   // 503: Service Unavailable
      HttpStatusCode.GATEWAY_TIMEOUT,       // 504: Gateway Timeout
    ];

    return retryableStatusCodes.includes(error.statusCode);
  }

  getDelay(attempt: number, error?: ApiError): number {
    // Специальная обработка rate limiting (429)
    // Если сервер указал, через сколько можно повторить запрос, используем это значение
    // Используем type narrowing для гарантии наличия retryAfter
    if (error?.statusCode === HttpStatusCode.TOO_MANY_REQUESTS) {
      // TypeScript знает, что для 429 ошибок retryAfter всегда присутствует
      return error.retryAfter * 1000; // Конвертируем секунды в миллисекунды
    }

    // Exponential backoff: delay = baseDelay * 2^attempt
    // Примеры (при baseDelay=1000, maxDelay=10000):
    // attempt 0: 1000ms
    // attempt 1: 2000ms
    // attempt 2: 4000ms
    // attempt 3: 8000ms
    // attempt 4: 10000ms (ограничено maxDelay)
    const delay = this.baseDelay * Math.pow(2, attempt);

    // Ограничиваем максимальной задержкой
    return Math.min(delay, this.maxDelay);
  }
}
