/**
 * HTTP Client модуль - экспорт компонентов
 */

export type { IHttpClient } from './i-http-client.interface.js';
export { AxiosHttpClient } from './axios-http-client.js';
export { MockHttpClient } from './mock-http-client.js';
export type { HttpConfig } from './http-config.interface.js';
export type {
  HttpTrafficGuard,
  OutgoingRequest,
  ObservedResponse,
} from './http-traffic-guard.interface.js';

/**
 * @deprecated Use AxiosHttpClient instead
 * Backward compatibility alias
 */
export { AxiosHttpClient as HttpClient } from './axios-http-client.js';
