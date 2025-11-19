/**
 * Output DTO для получения списка полей
 *
 * API: GET /v2/fields
 */

import type { FieldWithUnknownFields } from '@tracker_api/entities/index.js';

/**
 * Список полей трекера
 *
 * ВАЖНО: API /v2/fields возвращает массив полей напрямую,
 * без обертки в объект (в отличие от некоторых других API)
 */
export type FieldsListOutput = readonly FieldWithUnknownFields[];
