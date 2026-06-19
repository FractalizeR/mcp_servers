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
 * @deprecated Номер страницы (с 1). Заменён на {@link CursorSchema} (opaque
 * cursor); удаляется в этапе 3.1. Новые схемы используют `cursor`.
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
 * Непрозрачный курсор следующей страницы.
 *
 * Значение берётся из `pagination.nextCursor` предыдущего ответа того же
 * инструмента. Кодирует путь и размер страницы предыдущего запроса, поэтому
 * несовместим с `perPage`/`fetchAll`/`maxItems`/`maxTotalItems`
 * (см. {@link noCursorWithBulkParams}). Для batch-инструментов допустим только
 * при ровно одном issueId (см. {@link cursorRequiresSingleIssue}).
 */
export const CursorSchema = z
  .string()
  .optional()
  .describe(
    'Непрозрачный курсор следующей страницы из pagination.nextCursor. ' +
      'Использовать ТОЛЬКО с тем же инструментом, который его выдал. ' +
      'Несовместим с perPage/fetchAll/maxItems/maxTotalItems.'
  );

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
    'Если true — обойти все страницы по Link rel="next" с защитным лимитом ' +
      'maxItems на цепочку. По умолчанию false — возвращается одна страница; ' +
      'листать вручную через page, ориентируясь на pagination.hasNextPage. ' +
      'Несовместимо с явным page.'
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
 * @deprecated Сообщение об ошибке конфликта `page` + `fetchAll`. Удаляется в
 * этапе 3.1 вместе с {@link noPageFetchAllConflict}.
 */
export const PAGINATION_CONFLICT_MESSAGE =
  'Параметры page и fetchAll несовместимы: при fetchAll=true обход всегда ' +
  'начинается с первой страницы. Уберите page либо fetchAll.';

/**
 * @deprecated Предикат для `.refine`: запрещает одновременное `page` и
 * `fetchAll=true`. Заменён на {@link noCursorWithBulkParams}; удаляется в 3.1.
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

/**
 * Сообщение об ошибке конфликта `cursor` с параметрами первой выборки/bulk-обхода.
 */
export const PAGINATION_CURSOR_CONFLICT_MESSAGE =
  'Курсор несовместим с perPage/fetchAll/maxItems/maxTotalItems: размер страницы ' +
  'и параметры обхода зафиксированы внутри курсора. Передайте только cursor.';

/**
 * Предикат для `.refine` (R9): `cursor` исключает любой из параметров первой
 * выборки/bulk-обхода (`perPage`/`fetchAll`/`maxItems`/`maxTotalItems`).
 *
 * Все они либо уже зафиксированы внутри курсор-пути (`perPage`), либо относятся
 * к режиму полного обхода (`fetchAll`/`maxItems`/`maxTotalItems`), который с
 * ручным курсором не совмещается.
 *
 * @example
 * MySchema.refine(noCursorWithBulkParams, {
 *   message: PAGINATION_CURSOR_CONFLICT_MESSAGE,
 *   path: ['cursor'],
 * })
 */
export function noCursorWithBulkParams(data: {
  readonly cursor?: string | undefined;
  readonly perPage?: number | undefined;
  readonly fetchAll?: boolean | undefined;
  readonly maxItems?: number | undefined;
  readonly maxTotalItems?: number | undefined;
}): boolean {
  if (data.cursor === undefined) {
    return true;
  }
  return (
    data.perPage === undefined &&
    data.fetchAll === undefined &&
    data.maxItems === undefined &&
    data.maxTotalItems === undefined
  );
}

/**
 * Сообщение об ошибке использования курсора в batch-инструменте с >1 issueId.
 */
export const PAGINATION_CURSOR_BATCH_MESSAGE =
  'Курсор относится к одной задаче и допустим только при передаче ровно одного ' +
  'issueId. Листайте задачи по одной либо используйте fetchAll для нескольких.';

/**
 * Предикат для `.refine` (R1): в batch-инструментах курсор валиден ТОЛЬКО при
 * `issueIds.length === 1`.
 *
 * Курсор декодируется в путь конкретной задачи (`/v3/issues/A-1/comments?id=...`);
 * применение того же пути к другим задачам дало бы 404 или чужие данные.
 * fetchAll остаётся допустимым для нескольких задач (он per-issue внутри).
 *
 * @example
 * MySchema.refine(cursorRequiresSingleIssue, {
 *   message: PAGINATION_CURSOR_BATCH_MESSAGE,
 *   path: ['cursor'],
 * })
 */
export function cursorRequiresSingleIssue(data: {
  readonly cursor?: string | undefined;
  readonly issueIds?: readonly unknown[] | undefined;
}): boolean {
  if (data.cursor === undefined) {
    return true;
  }
  return data.issueIds !== undefined && data.issueIds.length === 1;
}
