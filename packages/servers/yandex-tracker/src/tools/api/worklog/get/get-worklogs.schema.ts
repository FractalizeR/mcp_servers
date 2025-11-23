/**
 * Zod схема для валидации параметров GetWorklogsTool
 */

import { z } from 'zod';
import { IssueKeysSchema, FieldsSchema } from '#common/schemas/index.js';

/**
 * Схема параметров для получения записей времени (batch режим)
 */
export const GetWorklogsParamsSchema = z.object({
  /**
   * Массив идентификаторов или ключей задач (обязательно)
   */
  issueIds: IssueKeysSchema.describe("Array of issue IDs or keys (e.g., ['TEST-123', 'TEST-456'])"),

  /**
   * Поля, которые нужно вернуть (обязательно)
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type GetWorklogsParams = z.infer<typeof GetWorklogsParamsSchema>;
