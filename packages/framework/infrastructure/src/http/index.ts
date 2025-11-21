/**
 * HTTP слой - экспорт всех компонентов
 *
 * Включает:
 * - HTTP Client (базовый Axios wrapper)
 * - Retry механизм (стратегии + handler)
 * - Error обработку (ErrorMapper)
 */

// Client
export { HttpClient } from './client/http-client.js';
export type { HttpConfig } from './client/http-config.interface.js';

// Retry
export type { RetryStrategy } from './retry/retry-strategy.interface.js';
export { ExponentialBackoffStrategy } from './retry/exponential-backoff.strategy.js';
export { RetryHandler } from './retry/retry-handler.js';

// Error
export { ErrorMapper } from './error/error-mapper.js';
export { ApiErrorClass } from './error/api-error.class.js';
export type { ApiErrorDetails } from './error/api-error.class.js';
