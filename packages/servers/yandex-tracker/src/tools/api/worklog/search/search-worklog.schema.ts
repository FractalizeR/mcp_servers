/**
 * Zod схема для валидации параметров SearchWorklogTool
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
  PaginationMetaSchema,
  buildOutputSchema,
} from '#common/schemas/index.js';

/**
 * Заменяет паттерн "перебрать все задачи через find_issues, затем
 * get_worklogs на каждую" одним запросом с фильтром по автору/датам.
 */
export const SearchWorklogParamsSchema = z
  .object({
    /** UID автора записи времени (опционально) */
    createdBy: z
      .string()
      .optional()
      .describe(
        'UID автора записи времени (например, 1130000048722754). ЛОГИН НЕ РАБОТАЕТ: ' +
          'API не отдаёт ошибку на логин, а молча возвращает пустой список — UID можно ' +
          'получить через find_users/get_users.'
      ),

    /** Начало диапазона дат создания, ISO 8601 (опционально) */
    createdAtFrom: z.string().optional(),

    /** Конец диапазона дат создания, ISO 8601 (опционально) */
    createdAtTo: z.string().optional(),

    /** Количество записей на странице (опционально) */
    perPage: makePerPageSchema(200),

    /** Непрозрачный курсор следующей страницы (из pagination.nextCursor) */
    cursor: CursorSchema,

    /** Полный обход всех страниц (opt-in) */
    fetchAll: FetchAllSchema,

    /** Лимит записей на цепочку обхода при fetchAll=true */
    maxItems: MaxItemsSchema,

    /** Список полей для возврата (обязательно) */
    fields: FieldsSchema,
  })
  .refine(noCursorWithBulkParams, {
    message: PAGINATION_CURSOR_CONFLICT_MESSAGE,
    path: ['cursor'],
  });

export type SearchWorklogParams = z.infer<typeof SearchWorklogParamsSchema>;

export const SearchWorklogOutputDataSchema = z.object({
  worklog: z.array(FilteredEntitySchema),
  count: z.number(),
  pagination: PaginationMetaSchema,
});

export const SearchWorklogOutputSchema = buildOutputSchema(SearchWorklogOutputDataSchema);
