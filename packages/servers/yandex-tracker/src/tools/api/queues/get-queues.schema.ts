/**
 * Zod схема для валидации параметров GetQueuesTool
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
} from '#common/schemas/index.js';

/**
 * Схема параметров для получения списка очередей
 */
export const GetQueuesParamsSchema = z
  .object({
    /**
     * Количество записей на странице (опционально, потолок 100)
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
export type GetQueuesParams = z.infer<typeof GetQueuesParamsSchema>;
