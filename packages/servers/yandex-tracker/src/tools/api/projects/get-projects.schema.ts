/**
 * Zod схема для валидации параметров GetProjectsTool
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
 * Схема параметров для получения списка проектов
 */
export const GetProjectsParamsSchema = z
  .object({
    /**
     * Количество записей на странице (опционально)
     */
    perPage: makePerPageSchema(100),

    /**
     * Непрозрачный курсор следующей страницы (из pagination.nextCursor)
     */
    cursor: CursorSchema,

    /**
     * Полный обход всех страниц (opt-in)
     */
    fetchAll: FetchAllSchema,

    /**
     * Лимит записей на цепочку обхода при fetchAll=true
     */
    maxItems: MaxItemsSchema,

    /**
     * Дополнительные поля для включения в ответ (опционально)
     */
    expand: z.string().optional(),

    /**
     * Фильтр по ID очереди (опционально)
     */
    queueId: z.string().optional(),

    /**
     * Список полей для возврата (обязательно)
     */
    fields: FieldsSchema,
  })
  .refine(noCursorWithBulkParams, {
    message: PAGINATION_CURSOR_CONFLICT_MESSAGE,
    path: ['cursor'],
  });

/**
 * Вывод типа из схемы
 */
export type GetProjectsParams = z.infer<typeof GetProjectsParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 *
 * `total` — только реальное значение из `pagination.total` (seekable endpoint),
 * поэтому опционально (см. комментарий в tool.ts).
 */
export const GetProjectsOutputDataSchema = z.object({
  projects: z.array(FilteredEntitySchema),
  total: z.number().optional(),
  count: z.number(),
  pagination: PaginationMetaSchema,
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const GetProjectsOutputSchema = buildOutputSchema(GetProjectsOutputDataSchema);
