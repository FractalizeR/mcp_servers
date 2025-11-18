/**
 * Zod схема для валидации параметров AddWorklogTool
 */

import { z } from 'zod';
import { IssueKeySchema } from '../../../../common/schemas/index.js';

/**
 * Схема параметров для добавления записи времени
 */
export const AddWorklogParamsSchema = z.object({
  /**
   * Идентификатор или ключ задачи (обязательно)
   */
  issueId: IssueKeySchema.describe('Issue ID or key (e.g., TEST-123)'),

  /**
   * Дата и время начала работы (ISO 8601) (обязательно)
   */
  start: z.string().describe('Start date and time (ISO 8601, e.g., 2023-01-15T10:00:00.000+0000)'),

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
});

/**
 * Вывод типа из схемы
 */
export type AddWorklogParams = z.infer<typeof AddWorklogParamsSchema>;
