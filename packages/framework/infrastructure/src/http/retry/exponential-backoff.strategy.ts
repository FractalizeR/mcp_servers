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

import type { RetryStrategy, RetryContext } from './retry-strategy.interface.js';
import type { ApiError } from '../../types.js';
import { HttpStatusCode } from '../../types.js';

/**
 * Статус-коды с НЕОПРЕДЕЛЁННЫМ исходом запроса: сервер мог как не обработать
 * запрос (сеть недоступна, таймаут), так и обработать его, но не успеть
 * отдать ответ (5xx от шлюза, 429). Именно поэтому повтор POST при таких
 * статусах небезопасен без явно объявленной идемпотентности.
 */
const AMBIGUOUS_OUTCOME_STATUS_CODES: ReadonlySet<HttpStatusCode> = new Set([
  HttpStatusCode.NETWORK_ERROR, // 0: нет ответа от сервера
  HttpStatusCode.REQUEST_TIMEOUT, // 408: Request Timeout
  HttpStatusCode.TOO_MANY_REQUESTS, // 429: Rate Limiting
  HttpStatusCode.INTERNAL_SERVER_ERROR, // 500: Internal Server Error
  HttpStatusCode.BAD_GATEWAY, // 502: Bad Gateway
  HttpStatusCode.SERVICE_UNAVAILABLE, // 503: Service Unavailable
  HttpStatusCode.GATEWAY_TIMEOUT, // 504: Gateway Timeout
]);

export class ExponentialBackoffStrategy implements RetryStrategy {
  readonly maxRetries: number;
  private readonly baseDelay: number;
  private readonly maxDelay: number;

  /**
   * @param maxRetries - максимальное количество попыток (по умолчанию 3)
   * @param baseDelayMs - базовая задержка в миллисекундах (по умолчанию 1000)
   * @param maxDelayMs - максимальная задержка в миллисекундах (по умолчанию 10000)
   */
  constructor(maxRetries: number = 3, baseDelayMs: number = 1000, maxDelayMs: number = 10000) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelayMs;
    this.maxDelay = maxDelayMs;
  }

  shouldRetry(context: RetryContext, error: ApiError, attempt: number): boolean {
    // Проверка лимита попыток
    if (attempt >= this.maxRetries) {
      return false;
    }

    if (!this.isOutcomeAmbiguous(error)) {
      return false;
    }

    // POST небезопасно повторять вслепую: сервер мог успеть выполнить запрос,
    // не успев отдать ответ — повтор создаст дубль (задача, комментарий,
    // массовая операция). Исключения:
    // - 429: сервер сам просит повторить, запрос заведомо не выполнялся;
    // - вызывающий явно объявил запрос идемпотентным (например, отправил
    //   ключ идемпотентности, который сервер учитывает при повторе).
    if (context.method === 'post') {
      return (
        error.statusCode === HttpStatusCode.TOO_MANY_REQUESTS ||
        context.idempotencyDeclared === true
      );
    }

    return true;
  }

  isOutcomeAmbiguous(error: ApiError): boolean {
    return AMBIGUOUS_OUTCOME_STATUS_CODES.has(error.statusCode);
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
