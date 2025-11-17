/**
 * Zod схема для валидации параметров IssueUrlTool
 */

import { z } from 'zod';
import { IssueKeysSchema } from '../../../common/schemas/index.js';

/**
 * Схема параметров для получения URL задач
 */
export const IssueUrlParamsSchema = z.object({
  /**
   * Массив ключей задач в формате QUEUE-123
   */
  issueKeys: IssueKeysSchema,
});

/**
 * Вывод типа из схемы
 */
export type IssueUrlParams = z.infer<typeof IssueUrlParamsSchema>;
