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
 *
 * Отчёт детектора незаполненных полей (план `plan_tool_contract_unification`,
 * пакет 2.8: закрытие долга «обход paginatedFieldFilter», README §2.8) —
 * `filterFn.getReport()`, вызываемый ПОСЛЕ `BatchResultProcessor.process()`.
 * До 2.8 отчёт не поднимался наружу, и три инструмента категории `issues`
 * обходили это второй самостоятельной фильтрацией сырых данных через
 * `ResponseFieldFilter.filterWithReport()` — тот же проход по данным дважды.
 * Здесь репорт копится в замыкании по мере вызовов `filterFn` (по одному на
 * успешную задачу батча) и не требует отдельного прохода.
 */

import { ResponseFieldFilter } from '@fractalizer/mcp-core';

import type { PaginatedResult, PaginationMeta } from '#tracker_api/entities/common/index.js';

/**
 * Пагинируемый результат с отфильтрованными по `fields` элементами.
 */
export interface FilteredPaginatedResult<T> {
  /** Элементы с оставленными полями. */
  readonly items: T[];
  /** Метаданные пагинации (прокидываются без изменений). */
  readonly pagination: PaginationMeta;
}

/** Отчёт детектора незаполненных полей, агрегированный по всему батчу. */
export interface PaginatedFieldFilterReport {
  /** Пути из `fields`, не давшие значения ни у одного элемента ни одной задачи батча. */
  readonly fieldsWithoutValue: string[];
}

/** `filterFn` для `BatchResultProcessor.process`, дополнительно копящий отчёт детектора. */
export interface PaginatedFieldFilterFn<T> {
  (data: PaginatedResult<T>): FilteredPaginatedResult<T>;
  /**
   * Отчёт по ВСЕМ вызовам `filterFn` до этого момента — вызывать после
   * `BatchResultProcessor.process()`, когда все успешные задачи батча уже
   * прошли через фильтр (см. {@link paginatedFieldFilter}).
   */
  getReport(): PaginatedFieldFilterReport;
}

/**
 * Построить `filterFn` для `BatchResultProcessor.process`.
 *
 * Путь считается "без значения", только если он не дал значения ни у одного
 * элемента ни одной страницы ни одной задачи батча — та же семантика, что и
 * у {@link ResponseFieldFilter.filterWithReport} для одного массива, поднятая
 * на уровень батча (частичная пустота у одной задачи, при наличии значения у
 * другой, — не повод предупреждать).
 *
 * @param fields - список полей для возврата (применяется к каждому элементу)
 * @returns функция `PaginatedResult<T> → FilteredPaginatedResult<T>` с методом `getReport()`
 *
 * @example
 * const filter = paginatedFieldFilter(fields);
 * const processed = BatchResultProcessor.process(results, filter);
 * const { fieldsWithoutValue } = filter.getReport();
 * // processed.successful[i].data === { items, pagination }
 */
export function paginatedFieldFilter<T>(fields: string[]): PaginatedFieldFilterFn<T> {
  const extractedFields = new Set<string>();

  const filterFn = ((data: PaginatedResult<T>): FilteredPaginatedResult<T> => {
    const { result, fieldsWithoutValue } = ResponseFieldFilter.filterWithReport<T[]>(
      data.items,
      fields
    );

    for (const field of fields) {
      if (!fieldsWithoutValue.includes(field)) {
        extractedFields.add(field);
      }
    }

    return { items: result, pagination: data.pagination };
  }) as PaginatedFieldFilterFn<T>;

  filterFn.getReport = () => ({
    fieldsWithoutValue: fields.filter((field) => !extractedFields.has(field)),
  });

  return filterFn;
}
