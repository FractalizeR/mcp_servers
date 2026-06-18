/**
 * Zod схема для валидации параметров GetProjectsTool
 */

import { z } from 'zod';
import {
  FieldsSchema,
  PageSchema,
  makePerPageSchema,
  FetchAllSchema,
  MaxItemsSchema,
  noPageFetchAllConflict,
  PAGINATION_CONFLICT_MESSAGE,
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
     * Номер страницы (начинается с 1)
     */
    page: PageSchema,

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
  .refine(noPageFetchAllConflict, {
    message: PAGINATION_CONFLICT_MESSAGE,
    path: ['page'],
  });

/**
 * Вывод типа из схемы
 */
export type GetProjectsParams = z.infer<typeof GetProjectsParamsSchema>;
