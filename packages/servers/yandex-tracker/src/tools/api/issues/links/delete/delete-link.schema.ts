/**
 * Zod схема для валидации параметров DeleteLinkTool
 */

import { z } from 'zod';
import { IssueKeySchema } from '../../../../../common/schemas/index.js';

/**
 * Схема параметров для удаления связи
 */
export const DeleteLinkParamsSchema = z.object({
  /**
   * Ключ или ID задачи
   */
  issueId: IssueKeySchema,

  /**
   * ID связи для удаления
   */
  linkId: z.string().min(1, 'linkId не может быть пустым'),
});

/**
 * Вывод типа из схемы
 */
export type DeleteLinkParams = z.infer<typeof DeleteLinkParamsSchema>;
