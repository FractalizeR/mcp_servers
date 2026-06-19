/**
 * Zod схема для валидации параметров GetIssueChangelogTool
 */

import { z } from 'zod';
import {
  IssueKeysSchema,
  FieldsSchema,
  PerPageSchema,
  FetchAllSchema,
  MaxItemsSchema,
  MaxTotalItemsSchema,
  CursorSchema,
  noCursorWithBulkParams,
  cursorRequiresSingleIssue,
  PAGINATION_CURSOR_CONFLICT_MESSAGE,
  PAGINATION_CURSOR_BATCH_MESSAGE,
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
     * Непрозрачный курсор следующей страницы (из pagination.nextCursor).
     * Допустим только при ровно одном issueKey; несовместим с bulk-параметрами.
     */
    cursor: CursorSchema,

    /**
     * Количество записей истории на странице (1..100).
     */
    perPage: PerPageSchema,

    /**
     * Полный обход всех страниц истории (opt-in).
     */
    fetchAll: FetchAllSchema,

    /**
     * Защитный лимит по количеству записей на одну задачу при fetchAll=true.
     */
    maxItems: MaxItemsSchema,

    /** Общий потолок записей на весь batch-ответ при fetchAll=true (опционально) */
    maxTotalItems: MaxTotalItemsSchema,

    /**
     * Опциональный массив полей для фильтрации ответа
     */
    fields: FieldsSchema,
  })
  .refine(noCursorWithBulkParams, {
    message: PAGINATION_CURSOR_CONFLICT_MESSAGE,
    path: ['cursor'],
  })
  // Поле задач в changelog называется issueKeys — адаптируем под предикат,
  // который оперирует issueIds (общий контракт batch-инструментов).
  .refine((data) => cursorRequiresSingleIssue({ cursor: data.cursor, issueIds: data.issueKeys }), {
    message: PAGINATION_CURSOR_BATCH_MESSAGE,
    path: ['cursor'],
  });

/**
 * Вывод типа из схемы
 */
export type GetIssueChangelogParams = z.infer<typeof GetIssueChangelogParamsSchema>;
