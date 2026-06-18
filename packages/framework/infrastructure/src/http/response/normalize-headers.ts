/**
 * Нормализация HTTP-заголовков ответа.
 *
 * Ответственность (SRP):
 * - ТОЛЬКО приведение «сырых» заголовков (axios `AxiosHeaders`, plain object,
 *   массивы значений) к единому виду `Record<string, string>` с ключами
 *   в нижнем регистре.
 *
 * Generic-примитив HTTP-слоя: не знает ни о Трекере, ни о пагинации.
 */

import type { ResponseHeaders } from '../../types.js';

/**
 * Привести произвольные заголовки ответа к нормализованному виду.
 *
 * - Ключи → нижний регистр (HTTP-заголовки регистронезависимы).
 * - Значения-массивы склеиваются через ', '.
 * - `undefined`/`null` значения отбрасываются.
 * - Поддерживает axios `AxiosHeaders` (через `toJSON`, если доступен).
 *
 * @param raw - сырые заголовки из HTTP-ответа
 * @returns нормализованные заголовки
 */
export function normalizeHeaders(raw: unknown): ResponseHeaders {
  const result: ResponseHeaders = {};

  if (!raw || typeof raw !== 'object') {
    return result;
  }

  // AxiosHeaders предоставляет toJSON() для получения plain-объекта
  const maybeToJson = (raw as { toJSON?: () => unknown }).toJSON;
  const source: unknown = typeof maybeToJson === 'function' ? maybeToJson.call(raw) : raw;

  if (!source || typeof source !== 'object') {
    return result;
  }

  for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
    if (value === undefined || value === null) {
      continue;
    }

    const lowerKey = key.toLowerCase();
    result[lowerKey] = Array.isArray(value) ? value.map(String).join(', ') : String(value);
  }

  return result;
}
