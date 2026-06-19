/**
 * Zod схема для валидации параметров GetCommentsTool
 */

import { z } from 'zod';
import {
  IssueKeysSchema,
  ExpandSchema,
  FieldsSchema,
  PageSchema,
  makePerPageSchema,
  FetchAllSchema,
  MaxItemsSchema,
  MaxTotalItemsSchema,
  noPageFetchAllConflict,
  PAGINATION_CONFLICT_MESSAGE,
} from '#common/schemas/index.js';

/**
 * Схема параметров для получения комментариев
 */
export const GetCommentsParamsSchema = z
  .object({
    /**
     * Массив идентификаторов или ключей задач (обязательно)
     */
    issueIds: IssueKeysSchema.describe(
      "Array of issue IDs or keys (e.g., ['TEST-123', 'TEST-456'])"
    ),

    /**
     * Количество комментариев на странице (опционально)
     */
    perPage: makePerPageSchema(500),

    /**
     * Номер страницы (опционально)
     */
    page: PageSchema,

    /**
     * Opt-in полного обхода всех страниц (опционально)
     */
    fetchAll: FetchAllSchema,

    /**
     * Максимум комментариев на одну задачу при fetchAll=true (опционально)
     */
    maxItems: MaxItemsSchema,

    /** Общий потолок записей на весь batch-ответ при fetchAll=true (опционально) */
    maxTotalItems: MaxTotalItemsSchema,

    /**
     * Параметр expand для включения дополнительных данных (опционально)
     */
    expand: ExpandSchema,

    /**
     * Массив полей для возврата в результате (обязательный)
     * Примеры: ['id', 'text', 'createdAt'], ['id', 'text', 'createdBy.login']
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
export type GetCommentsParams = z.infer<typeof GetCommentsParamsSchema>;
