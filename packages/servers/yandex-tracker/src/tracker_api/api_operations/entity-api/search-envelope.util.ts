/**
 * Разбор тела ответа `POST /v3/entities/{type}/_search`.
 *
 * Живёт отдельно от операции: операция отвечает за пагинацию и запросы, а
 * здесь — знание о форме ответа и о том, какие её варианты допустимы.
 */

import type { EntityApiRecordWithUnknownFields } from '#tracker_api/entities/index.js';

/** Разобранный конверт `_search`: элементы страницы + счётчики API. */
export interface ParsedSearchEnvelope {
  readonly items: EntityApiRecordWithUnknownFields[];
  readonly hits: number | undefined;
  readonly pages: number | undefined;
}

/**
 * Разобрать тело ответа `_search` в форму `{ hits, pages, values }`
 * (подтверждено живыми пробами — см. JSDoc модуля).
 *
 * Терпимо к двум крайним случаям без риска тихой потери данных:
 * - `values` отсутствует целиком → пустая страница (наблюдалось живьём на
 *   `goal` с нулевой выдачей);
 * - тело — «голый» массив (форма, которую предполагает референсный клиент;
 *   живьём НЕ наблюдалась, оставлена как forward-compat, не как догадка).
 *
 * Любая ДРУГАЯ форма — explicit-ошибка с дампом формы, а не тихая догадка
 * об имени поля.
 */
export function parseSearchEnvelope(data: unknown): ParsedSearchEnvelope {
  if (Array.isArray(data)) {
    return {
      items: data as EntityApiRecordWithUnknownFields[],
      hits: undefined,
      pages: undefined,
    };
  }

  if (data !== null && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if ('values' in obj || 'hits' in obj || 'pages' in obj) {
      const rawValues = obj['values'];
      if (rawValues !== undefined && !Array.isArray(rawValues)) {
        throw unexpectedShapeError(data, "поле 'values' присутствует, но не является массивом");
      }
      return {
        items: Array.isArray(rawValues) ? (rawValues as EntityApiRecordWithUnknownFields[]) : [],
        hits: typeof obj['hits'] === 'number' ? obj['hits'] : undefined,
        pages: typeof obj['pages'] === 'number' ? obj['pages'] : undefined,
      };
    }
  }

  if (data === null || data === undefined) {
    return { items: [], hits: undefined, pages: undefined };
  }

  throw unexpectedShapeError(data, 'ни массив, ни конверт {hits, pages, values}');
}

function unexpectedShapeError(data: unknown, reason: string): Error {
  const shapeHint =
    data !== null && typeof data === 'object'
      ? `объект с полями [${Object.keys(data).join(', ')}]`
      : typeof data;
  return new Error(
    `Entity API вернул неожиданную форму ответа для _search (${reason}): получено — ${shapeHint}. ` +
      'Ожидался конверт {hits, pages, values} (подтверждено живыми пробами) или, как fallback, ' +
      'голый JSON-массив. Нужна повторная живая проверка сырого тела ответа, прежде чем ' +
      'предполагать иную форму.'
  );
}
