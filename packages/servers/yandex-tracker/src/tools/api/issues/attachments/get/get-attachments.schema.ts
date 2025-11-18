/**
 * Zod схема для валидации параметров GetAttachmentsTool
 */

import { z } from 'zod';
import { IssueKeySchema } from '../../../../../common/schemas/index.js';

/**
 * Схема параметров для получения списка файлов задачи
 */
export const GetAttachmentsParamsSchema = z.object({
  /**
   * Ключ или ID задачи для получения списка файлов
   */
  issueId: IssueKeySchema,
});

/**
 * Вывод типа из схемы
 */
export type GetAttachmentsParams = z.infer<typeof GetAttachmentsParamsSchema>;
