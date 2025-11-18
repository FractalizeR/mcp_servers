/**
 * Zod схема для валидации параметров DeleteAttachmentTool
 */

import { z } from 'zod';
import { IssueKeySchema } from '../../../../../common/schemas/index.js';

/**
 * Схема параметров для удаления файла из задачи
 */
export const DeleteAttachmentParamsSchema = z.object({
  /**
   * Ключ или ID задачи
   */
  issueId: IssueKeySchema,

  /**
   * ID прикрепленного файла для удаления
   */
  attachmentId: z.string().min(1, 'ID файла обязателен'),
});

/**
 * Вывод типа из схемы
 */
export type DeleteAttachmentParams = z.infer<typeof DeleteAttachmentParamsSchema>;
