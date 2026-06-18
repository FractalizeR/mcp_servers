/**
 * Хелпер фильтрации полей для пагинируемых batch-результатов (DP-3, вариант A).
 *
 * Операции list-batch возвращают `BatchResult<string, PaginatedResult<Entry>>`.
 * `BatchResultProcessor` остаётся generic (`data = PaginatedResult<Entry>`);
 * этот хелпер строит `filterFn`, который фильтрует `items` через
 * `ResponseFieldFilter` и прокидывает `pagination` без изменений — чтобы не
 * дублировать распаковку `{ items, pagination }` в каждом инструменте.
 *
 * Важно: результат — объект (а не массив), поэтому задача с 0 записей остаётся
 * truthy и не уезжает в `failed` BatchResultProcessor'а.
 */

import { ResponseFieldFilter } from '@fractalizer/mcp-core';

import type { PaginatedResult, PaginationMeta } from '../entities/common/index.js';

/**
 * Пагинируемый результат с отфильтрованными по `fields` элементами.
 */
export interface FilteredPaginatedResult<T> {
  /** Элементы с оставленными полями. */
  readonly items: T[];
  /** Метаданные пагинации (прокидываются без изменений). */
  readonly pagination: PaginationMeta;
}

/**
 * Построить `filterFn` для `BatchResultProcessor.process`.
 *
 * @param fields - список полей для возврата (применяется к каждому элементу)
 * @returns функция `PaginatedResult<T> → FilteredPaginatedResult<T>`
 *
 * @example
 * const processed = BatchResultProcessor.process(results, paginatedFieldFilter(fields));
 * // processed.successful[i].data === { items, pagination }
 */
export function paginatedFieldFilter<T>(
  fields: string[]
): (data: PaginatedResult<T>) => FilteredPaginatedResult<T> {
  return (data) => ({
    items: data.items.map((item) => ResponseFieldFilter.filter<T>(item, fields)),
    pagination: data.pagination,
  });
}
