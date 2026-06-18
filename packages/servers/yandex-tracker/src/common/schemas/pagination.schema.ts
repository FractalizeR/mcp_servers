/**
 * Общие Zod-схемы пагинации для list-инструментов Яндекс.Трекера.
 *
 * Единый источник истины для полей `page`/`perPage`/`fetchAll`/`maxItems`/
 * `maxTotalItems`, чтобы исключить дубли по файлам инструментов.
 *
 * Семантика режимов:
 * - по умолчанию (`fetchAll` не задан/false) — одна страница + метаданные
 *   (`hasNextPage`/`total`/...), агент листает вручную через `page`;
 * - `fetchAll=true` — полный обход по `Link rel="next"` с защитными лимитами
 *   (`maxItems` на цепочку, `maxTotalItems` на весь batch-ответ) и флагом
 *   `truncated` при срабатывании лимита.
 *
 * Дефолты применяются на уровне операции/паджинатора (`DEFAULT_MAX_ITEMS` и
 * т.п. в `#tracker_api/utils`), поэтому схемы остаются `.optional()` без
 * `.default()` — здесь задаётся только верхний потолок валидации.
 */

import { z } from 'zod';

/**
 * Потолок Zod для `maxItems` (лимит на одну цепочку пагинации).
 *
 * Дефолт (500) применяет паджинатор; схема лишь ограничивает максимум,
 * который агент может запросить вручную.
 */
export const MAX_ITEMS_CEILING = 1000;

/**
 * Потолок Zod для `maxTotalItems` (общий бюджет записей на batch-ответ).
 *
 * Дефолт (1000) применяет инструмент/фасад.
 */
export const MAX_TOTAL_ITEMS_CEILING = 5000;

/**
 * Номер страницы (с 1). Идентичен для всех list-эндпоинтов.
 *
 * При `fetchAll=true` игнорируется — обход стартует с первой страницы.
 */
export const PageSchema = z
  .number()
  .int()
  .positive()
  .optional()
  .describe('Номер страницы (начинается с 1). Игнорируется при fetchAll=true.');

/**
 * Фабрика схемы `perPage`: потолок зависит от endpoint'а Трекера.
 *
 * @param max - максимум записей на странице для конкретного endpoint'а
 *   (`undefined` — без ограничения, например для `_search`).
 */
export function makePerPageSchema(max?: number): z.ZodOptional<z.ZodNumber> {
  const base = z.number().int().positive();
  const bounded = max !== undefined ? base.max(max) : base;
  const limit = max !== undefined ? `1..${max}` : '≥1';
  return bounded.optional().describe(`Количество записей на странице (${limit}).`);
}

/**
 * Размер страницы по умолчанию для большинства list-эндпоинтов (потолок 100).
 *
 * Для endpoint'ов с иным максимумом используйте {@link makePerPageSchema}.
 */
export const PerPageSchema = makePerPageSchema(100);

/**
 * Opt-in полного обхода всех страниц.
 */
export const FetchAllSchema = z
  .boolean()
  .optional()
  .describe(
    'Если true — обойти все страницы по Link rel="next" с защитными лимитами ' +
      '(maxItems на цепочку, maxTotalItems на весь ответ). По умолчанию false — ' +
      'возвращается одна страница; листать вручную через page, ориентируясь на ' +
      'pagination.hasNextPage. Несовместимо с явным page.'
  );

/**
 * Переопределение лимита записей на одну цепочку пагинации (per-issue).
 *
 * Дефолт — 500 (применяет паджинатор). Потолок схемы — {@link MAX_ITEMS_CEILING}.
 */
export const MaxItemsSchema = z
  .number()
  .int()
  .positive()
  .max(MAX_ITEMS_CEILING)
  .optional()
  .describe(
    'Максимум записей на одну задачу/цепочку при fetchAll=true (по умолчанию 500, ' +
      `максимум ${MAX_ITEMS_CEILING}). При срабатывании pagination.truncated=true.`
  );

/**
 * Общий потолок записей на весь batch-ответ инструмента.
 *
 * Дефолт — 1000 (применяет инструмент). Потолок схемы — {@link MAX_TOTAL_ITEMS_CEILING}.
 */
export const MaxTotalItemsSchema = z
  .number()
  .int()
  .positive()
  .max(MAX_TOTAL_ITEMS_CEILING)
  .optional()
  .describe(
    'Общий максимум записей на весь ответ инструмента при fetchAll=true ' +
      `(по умолчанию 1000, максимум ${MAX_TOTAL_ITEMS_CEILING}). По достижении ` +
      'оставшиеся задачи отдают только первую страницу с pagination.truncated=true.'
  );

/**
 * Сообщение об ошибке конфликта `page` + `fetchAll`.
 */
export const PAGINATION_CONFLICT_MESSAGE =
  'Параметры page и fetchAll несовместимы: при fetchAll=true обход всегда ' +
  'начинается с первой страницы. Уберите page либо fetchAll.';

/**
 * Предикат для `.refine`: запрещает одновременное указание `page` и `fetchAll=true`.
 *
 * Лог агенту не виден, поэтому конфликт сигнализируем ошибкой валидации.
 *
 * @example
 * MySchema.refine(noPageFetchAllConflict, {
 *   message: PAGINATION_CONFLICT_MESSAGE,
 *   path: ['page'],
 * })
 */
export function noPageFetchAllConflict(data: {
  readonly page?: number | undefined;
  readonly fetchAll?: boolean | undefined;
}): boolean {
  return !(data.fetchAll === true && data.page !== undefined);
}
