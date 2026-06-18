/**
 * Zod схема для валидации параметров GetComponentsTool
 */

import { z } from 'zod';
import {
  FieldsSchema,
  PageSchema,
  PerPageSchema,
  FetchAllSchema,
  MaxItemsSchema,
  noPageFetchAllConflict,
  PAGINATION_CONFLICT_MESSAGE,
} from '#common/schemas/index.js';

/**
 * Схема параметров для получения списка компонентов очереди
 */
export const GetComponentsParamsSchema = z
  .object({
    /**
     * ID или ключ очереди
     */
    queueId: z.string().min(1, 'Queue ID обязателен'),

    /**
     * Массив полей для возврата в результате (обязательный)
     * Примеры: ['id', 'name'], ['id', 'name', 'description', 'lead.login']
     */
    fields: FieldsSchema,

    /** Номер страницы (с 1). Игнорируется при fetchAll=true. */
    page: PageSchema,

    /** Количество записей на странице (1..100). */
    perPage: PerPageSchema,

    /** Если true — обойти все страницы по Link rel="next". */
    fetchAll: FetchAllSchema,

    /** Максимум записей при fetchAll=true (по умолчанию 500). */
    maxItems: MaxItemsSchema,
  })
  .refine(noPageFetchAllConflict, {
    message: PAGINATION_CONFLICT_MESSAGE,
    path: ['page'],
  });

/**
 * Вывод типа из схемы
 */
export type GetComponentsParams = z.infer<typeof GetComponentsParamsSchema>;
