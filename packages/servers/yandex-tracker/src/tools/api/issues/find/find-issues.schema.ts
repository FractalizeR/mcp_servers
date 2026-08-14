/**
 * Zod схема для валидации параметров FindIssuesTool
 */

import { z } from 'zod';
import {
  FieldsSchema,
  CursorSchema,
  makePerPageSchema,
  FetchAllSchema,
  MaxItemsSchema,
  noCursorWithBulkParams,
  PAGINATION_CURSOR_CONFLICT_MESSAGE,
  FilteredEntitySchema,
  FieldsReturnedSchema,
  PaginationMetaSchema,
  buildOutputSchema,
} from '#common/schemas/index.js';

/**
 * Схема параметров для поиска задач
 *
 * ВАЖНО: Хотя бы один из способов поиска должен быть указан
 */
export const FindIssuesParamsSchema = z
  .object({
    /**
     * Язык запросов Трекера (query language)
     * Пример: "Author: me() Resolution: empty()"
     */
    query: z.string().optional(),

    /**
     * Фильтр по полям (объект key-value)
     * Пример: { queue: "PROJ", status: "open" }
     */
    filter: z.record(z.string(), z.unknown()).optional(),

    /**
     * Список ключей задач
     * Пример: ["PROJ-1", "PROJ-2"]
     */
    keys: z.array(z.string()).optional(),

    /**
     * Ключ очереди
     * Пример: "DEVOPS"
     */
    queue: z.string().optional(),

    /**
     * ID сохранённого фильтра
     */
    filterId: z.string().optional(),

    /**
     * Сортировка результатов
     * Формат: ["+field1", "-field2"]
     * Пример: ["+created", "-priority"]
     */
    order: z.array(z.string()).optional(),

    /**
     * Количество результатов на странице (без жёсткого потолка для _search)
     */
    perPage: makePerPageSchema(),

    /**
     * Непрозрачный курсор следующей страницы (из pagination.nextCursor).
     *
     * При курсоре критерии поиска (query/filter/keys/queue/filterId/order)
     * ОБЯЗАНЫ быть переданы повторно: операция сверяет их хеш с хешем в курсоре.
     */
    cursor: CursorSchema,

    /**
     * Расширение ответа дополнительными полями
     * Возможные значения: "transitions", "attachments"
     */
    expand: z.array(z.string()).optional(),

    /**
     * Полный обход всех страниц (opt-in). Несовместимо с cursor.
     */
    fetchAll: FetchAllSchema,

    /**
     * Защитный лимит по количеству задач при fetchAll=true.
     */
    maxItems: MaxItemsSchema,

    /**
     * Опциональный массив полей для фильтрации ответа
     */
    fields: FieldsSchema,
  })
  .refine(
    (data) => {
      // Проверка: хотя бы один способ поиска должен быть указан
      return (
        data.query !== undefined ||
        data.filter !== undefined ||
        (data.keys !== undefined && data.keys.length > 0) ||
        data.queue !== undefined ||
        data.filterId !== undefined
      );
    },
    {
      message:
        'Должен быть указан хотя бы один способ поиска: query, filter, keys, queue или filterId',
    }
  )
  .refine(noCursorWithBulkParams, {
    message: PAGINATION_CURSOR_CONFLICT_MESSAGE,
    path: ['cursor'],
  });

/**
 * Вывод типа из схемы
 */
export type FindIssuesParams = z.infer<typeof FindIssuesParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const FindIssuesOutputDataSchema = z.object({
  count: z.number(),
  issues: z.array(FilteredEntitySchema),
  pagination: PaginationMetaSchema,
  fieldsReturned: FieldsReturnedSchema,
  searchCriteria: z.object({
    hasQuery: z.boolean(),
    hasFilter: z.boolean(),
    keysCount: z.number(),
    hasQueue: z.boolean(),
  }),
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const FindIssuesOutputSchema = buildOutputSchema(FindIssuesOutputDataSchema);
