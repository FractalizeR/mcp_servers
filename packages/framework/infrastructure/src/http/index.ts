/**
 * HTTP слой - экспорт всех компонентов
 *
 * Включает:
 * - HTTP Client (базовый Axios wrapper)
 * - Retry механизм (стратегии + handler)
 * - Error обработку (ErrorMapper)
 */

// Client
export type { IHttpClient } from './client/i-http-client.interface.js';
export { AxiosHttpClient } from './client/axios-http-client.js';
export { MockHttpClient } from './client/mock-http-client.js';
export type { HttpConfig } from './client/http-config.interface.js';
export type {
  HttpTrafficGuard,
  OutgoingRequest,
  ObservedResponse,
} from './client/http-traffic-guard.interface.js';

/**
 * @deprecated Use AxiosHttpClient instead
 * Backward compatibility alias
 */
export { AxiosHttpClient as HttpClient } from './client/axios-http-client.js';

// Retry
export type { RetryStrategy } from './retry/retry-strategy.interface.js';
export { ExponentialBackoffStrategy } from './retry/exponential-backoff.strategy.js';
export { RetryHandler } from './retry/retry-handler.js';

// Error
export { ErrorMapper } from './error/error-mapper.js';
export { ApiErrorClass } from './error/api-error.class.js';
export { ScopeViolationError } from './error/scope-violation.error.js';
export type { ApiErrorDetails } from './error/api-error.class.js';

// Response utilities (header normalization, Link header parsing)
export { normalizeHeaders, parseLinkHeader } from './response/index.js';
export type { ParsedLinkHeader } from './response/index.js';
