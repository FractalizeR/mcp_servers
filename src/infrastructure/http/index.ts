/**
 * HTTP слой - экспорт всех компонентов
 *
 * Включает:
 * - HTTP Client (базовый Axios wrapper)
 * - Retry механизм (стратегии + handler)
 * - Error обработку (ErrorMapper)
 */

// Client
export { HttpClient } from '@infrastructure/http/client/http-client.js';
export type { HttpConfig } from './client/http-config.interface.js';

// Retry
export type { RetryStrategy } from './retry/retry-strategy.interface.js';
export { ExponentialBackoffStrategy } from '@infrastructure/http/retry/exponential-backoff.strategy.js';
export { RetryHandler } from '@infrastructure/http/retry/retry-handler.js';

// Error
export { ErrorMapper } from '@infrastructure/http/error/error-mapper.js';
