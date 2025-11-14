/**
 * Zod схема для валидации параметров IssueUrlTool
 */

import { z } from 'zod';
import { IssueKeySchema } from '@mcp/tools/common/index.js';

/**
 * Схема параметров для получения URL задачи
 */
export const IssueUrlParamsSchema = z.object({
  /**
   * Ключ задачи в формате QUEUE-123
   */
  issueKey: IssueKeySchema,
});

/**
 * Вывод типа из схемы
 */
export type IssueUrlParams = z.infer<typeof IssueUrlParamsSchema>;
