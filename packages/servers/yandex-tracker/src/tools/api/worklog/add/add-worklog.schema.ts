/**
 * Zod схема для валидации параметров AddWorklogTool
 *
 * Паттерн POST операций: Input Pattern - индивидуальные параметры
 * Каждая задача имеет свои параметры (start, duration, comment)
 */

import { z } from 'zod';
import { IssueKeySchema, FieldsSchema } from '#common/schemas/index.js';

/**
 * Схема параметров для добавления записей времени (batch-режим)
 */
export const AddWorklogParamsSchema = z.object({
  /**
   * Массив записей времени с индивидуальными параметрами для каждой задачи
   */
  worklogs: z
    .array(
      z.object({
        /**
         * Идентификатор или ключ задачи (обязательно)
         */
        issueId: IssueKeySchema.describe('Issue ID or key (e.g., TEST-123)'),

        /**
         * Дата и время начала работы (ISO 8601) (обязательно)
         */
        start: z
          .string()
          .describe('Start date and time (ISO 8601, e.g., 2023-01-15T10:00:00.000+0000)'),

        /**
         * Продолжительность работы (обязательно)
         * Поддерживаются форматы:
         * - Человекочитаемый: "1h", "30m", "1h 30m"
         * - ISO 8601 Duration: "PT1H", "PT30M", "PT1H30M"
         */
        duration: z.string().describe('Duration (e.g., "1h 30m", "PT1H30M", "2 hours")'),

        /**
         * Комментарий к записи времени (опционально)
         */
        comment: z.string().optional(),
      })
    )
    .min(1, 'Массив worklogs должен содержать минимум 1 элемент')
    .describe('Array of worklogs to add to issues'),

  /**
   * Массив полей для возврата в результате (обязательный)
   * Примеры: ['id', 'duration', 'createdAt'], ['id', 'createdBy.login']
   * Применяется ко всем созданным записям времени
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type AddWorklogParams = z.infer<typeof AddWorklogParamsSchema>;
