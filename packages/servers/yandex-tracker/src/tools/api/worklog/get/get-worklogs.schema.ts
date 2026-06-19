/**
 * Zod схема для валидации параметров GetWorklogsTool
 */

import { z } from 'zod';
import { IssueKeysSchema, FieldsSchema } from '#common/schemas/index.js';
import {
  FetchAllSchema,
  MaxItemsSchema,
  MaxTotalItemsSchema,
  PageSchema,
  PerPageSchema,
  noPageFetchAllConflict,
  PAGINATION_CONFLICT_MESSAGE,
} from '#common/schemas/index.js';

/**
 * Схема параметров для получения записей времени (batch режим)
 *
 * Параметры пагинации применяются ко всем задачам одинаково.
 */
export const GetWorklogsParamsSchema = z
  .object({
    /**
     * Массив идентификаторов или ключей задач (обязательно)
     */
    issueIds: IssueKeysSchema.describe(
      "Array of issue IDs or keys (e.g., ['TEST-123', 'TEST-456'])"
    ),

    /**
     * Поля, которые нужно вернуть (обязательно)
     */
    fields: FieldsSchema,

    /** Номер страницы (с 1). Игнорируется при fetchAll=true. */
    page: PageSchema,

    /** Количество записей на странице. */
    perPage: PerPageSchema,

    /** Полный обход всех страниц по Link rel="next". */
    fetchAll: FetchAllSchema,

    /** Максимум записей на одну задачу при fetchAll=true. */
    maxItems: MaxItemsSchema,

    /** Общий потолок записей на весь batch-ответ при fetchAll=true (опционально) */
    maxTotalItems: MaxTotalItemsSchema,
  })
  .refine(noPageFetchAllConflict, {
    message: PAGINATION_CONFLICT_MESSAGE,
    path: ['page'],
  });

/**
 * Вывод типа из схемы
 */
export type GetWorklogsParams = z.infer<typeof GetWorklogsParamsSchema>;
