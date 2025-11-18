/**
 * Zod схема для валидации параметров GetIssueL inksTool
 */

import { z } from 'zod';
import { IssueKeySchema } from '../../../../../common/schemas/index.js';

/**
 * Схема параметров для получения связей задачи
 */
export const GetIssueLinksParamsSchema = z.object({
  /**
   * Ключ или ID задачи для получения связей
   */
  issueId: IssueKeySchema,
});

/**
 * Вывод типа из схемы
 */
export type GetIssueLinksParams = z.infer<typeof GetIssueLinksParamsSchema>;
