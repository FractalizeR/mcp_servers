/**
 * Zod схема для валидации параметров GetAttachmentsTool
 */

import { z } from 'zod';
import { IssueKeySchema, FieldsSchema } from '../../../../../common/schemas/index.js';

/**
 * Схема параметров для получения списка файлов задачи
 */
export const GetAttachmentsParamsSchema = z.object({
  /**
   * Ключ или ID задачи для получения списка файлов
   */
  issueId: IssueKeySchema,

  /**
   * Массив полей для возврата в результате (обязательный)
   * Примеры: ['id', 'name', 'size'], ['id', 'name', 'createdBy.display']
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type GetAttachmentsParams = z.infer<typeof GetAttachmentsParamsSchema>;
