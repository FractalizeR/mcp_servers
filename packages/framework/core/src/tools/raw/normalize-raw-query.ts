/**
 * Нормализация query-параметров raw-запроса под формат API.
 */

import type { RawApiQueryParams } from './raw-api.types.js';

/**
 * Query-значения после нормализации массивов: только скаляры.
 */
export type NormalizedRawQuery = Record<string, string | number | boolean>;

/**
 * Нормализует query-параметры: массивы сериализуются в строку через запятую
 * (`expand=a,b`).
 *
 * Это общая для Яндекс-API конвенция и паттерн проекта (см. find-issues,
 * get-comments в tracker). Делает поведение детерминированным и независимым от
 * дефолтного сериализатора axios (`key[]=a&key[]=b`), который API не парсят.
 *
 * @param query - исходные query-параметры
 * @returns нормализованные параметры или undefined
 */
export function normalizeRawQuery(query?: RawApiQueryParams): NormalizedRawQuery | undefined {
  if (!query) {
    return undefined;
  }

  const normalized: NormalizedRawQuery = {};
  for (const [key, value] of Object.entries(query)) {
    normalized[key] = Array.isArray(value) ? value.join(',') : value;
  }
  return normalized;
}
