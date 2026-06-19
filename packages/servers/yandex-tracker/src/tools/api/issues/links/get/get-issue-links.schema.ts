/**
 * Zod схема для валидации параметров GetIssueLinksTool
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
 * Схема параметров для получения связей задач
 *
 * Параметры пагинации применяются ко всем задачам одинаково.
 */
export const GetIssueLinksParamsSchema = z
  .object({
    /**
     * Массив ключей или ID задач для получения связей
     */
    issueIds: IssueKeysSchema.describe('Array of issue IDs or keys'),

    /**
     * Массив полей для возврата в результате (обязательный)
     * Примеры: ['id', 'type', 'object'], ['id', 'type.id', 'object.key']
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
export type GetIssueLinksParams = z.infer<typeof GetIssueLinksParamsSchema>;
