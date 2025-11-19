/**
 * Zod схема для валидации параметров UpdateWorklogTool
 */

import { z } from 'zod';
import { IssueKeySchema, FieldsSchema } from '../../../../common/schemas/index.js';

/**
 * Схема параметров для обновления записи времени
 */
export const UpdateWorklogParamsSchema = z.object({
  /**
   * Идентификатор или ключ задачи (обязательно)
   */
  issueId: IssueKeySchema.describe('Issue ID or key (e.g., TEST-123)'),

  /**
   * Идентификатор записи времени (обязательно)
   */
  worklogId: z.string().describe('Worklog ID'),

  /**
   * Дата и время начала работы (ISO 8601) (опционально)
   */
  start: z.string().optional(),

  /**
   * Продолжительность работы (опционально)
   * Поддерживаются форматы:
   * - Человекочитаемый: "1h", "30m", "1h 30m"
   * - ISO 8601 Duration: "PT1H", "PT30M", "PT1H30M"
   */
  duration: z.string().optional(),

  /**
   * Комментарий к записи времени (опционально)
   */
  comment: z.string().optional(),

  /**
   * Поля, которые нужно вернуть (обязательно)
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type UpdateWorklogParams = z.infer<typeof UpdateWorklogParamsSchema>;
