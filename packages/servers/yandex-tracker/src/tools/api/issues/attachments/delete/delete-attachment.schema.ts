/**
 * Zod схема для валидации параметров DeleteAttachmentTool
 */

import { z } from 'zod';
import { IssueKeySchema, buildOutputSchema } from '#common/schemas/index.js';

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

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const DeleteAttachmentOutputDataSchema = z.object({
  issueId: z.string(),
  attachmentId: z.string(),
  deleted: z.literal(true),
  message: z.string(),
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const DeleteAttachmentOutputSchema = buildOutputSchema(DeleteAttachmentOutputDataSchema);
