/**
 * HTTP Response утилиты — экспорт.
 *
 * Generic-примитивы для работы с ответами: нормализация заголовков
 * и разбор заголовка `Link` (RFC 5988) для пагинации.
 */

export { normalizeHeaders } from './normalize-headers.js';
export { parseLinkHeader } from './link-header.parser.js';
export type { ParsedLinkHeader } from './link-header.parser.js';
