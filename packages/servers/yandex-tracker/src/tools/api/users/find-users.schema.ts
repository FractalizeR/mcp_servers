/**
 * Zod схема для валидации параметров FindUsersTool
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

export const FindUsersParamsSchema = z
  .object({
    /** Количество записей на странице (опционально) */
    perPage: makePerPageSchema(100),

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

export type FindUsersParams = z.infer<typeof FindUsersParamsSchema>;

export const FindUsersOutputDataSchema = z.object({
  users: z.array(FilteredEntitySchema),
  count: z.number(),
  pagination: PaginationMetaSchema,
});

export const FindUsersOutputSchema = buildOutputSchema(FindUsersOutputDataSchema);
