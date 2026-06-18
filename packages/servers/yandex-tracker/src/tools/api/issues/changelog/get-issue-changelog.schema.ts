/**
 * Zod схема для валидации параметров GetIssueChangelogTool
 */

import { z } from 'zod';
import {
  IssueKeysSchema,
  FieldsSchema,
  PageSchema,
  PerPageSchema,
  FetchAllSchema,
  MaxItemsSchema,
  noPageFetchAllConflict,
  PAGINATION_CONFLICT_MESSAGE,
} from '#common/schemas/index.js';

/**
 * Схема параметров для получения истории изменений задач (batch-режим)
 *
 * Параметры пагинации применяются одинаково ко всем задачам batch'а.
 */
export const GetIssueChangelogParamsSchema = z
  .object({
    /**
     * Массив ключей задач для получения истории
     */
    issueKeys: IssueKeysSchema.describe('Массив ключей задач (например, ["QUEUE-1", "QUEUE-2"])'),

    /**
     * Номер страницы (с 1). Игнорируется при fetchAll=true.
     */
    page: PageSchema,

    /**
     * Количество записей истории на странице (1..100).
     */
    perPage: PerPageSchema,

    /**
     * Полный обход всех страниц истории (opt-in). Несовместимо с явным page.
     */
    fetchAll: FetchAllSchema,

    /**
     * Защитный лимит по количеству записей на одну задачу при fetchAll=true.
     */
    maxItems: MaxItemsSchema,

    /**
     * Опциональный массив полей для фильтрации ответа
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
export type GetIssueChangelogParams = z.infer<typeof GetIssueChangelogParamsSchema>;
