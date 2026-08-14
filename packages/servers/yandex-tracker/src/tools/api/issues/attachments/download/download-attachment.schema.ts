/**
 * Zod схема для валидации параметров DownloadAttachmentTool
 */

import { z } from 'zod';
import { IssueKeySchema, buildOutputSchema } from '#common/schemas/index.js';

/**
 * Схема параметров для скачивания файла из задачи
 */
export const DownloadAttachmentParamsSchema = z.object({
  /**
   * Ключ или ID задачи
   */
  issueId: IssueKeySchema,

  /**
   * ID прикрепленного файла
   */
  attachmentId: z.string().min(1, 'ID файла обязателен'),

  /**
   * Имя файла (используется в URL и для сохранения)
   */
  filename: z.string().min(1, 'Имя файла обязательно'),

  /**
   * Путь для сохранения файла (опционально)
   * Если не указан, вернется base64
   */
  saveToPath: z.string().optional(),
});

/**
 * Вывод типа из схемы
 */
export type DownloadAttachmentParams = z.infer<typeof DownloadAttachmentParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 *
 * Ровно одно из `savedTo`/`base64` присутствует — выбор определяется тем, был
 * ли передан `saveToPath` во входных параметрах (см. tool.ts).
 */
export const DownloadAttachmentOutputDataSchema = z.object({
  issueId: z.string(),
  attachmentId: z.string(),
  filename: z.string(),
  size: z.number(),
  mimetype: z.string(),
  savedTo: z.string().optional(),
  base64: z.string().optional(),
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const DownloadAttachmentOutputSchema = buildOutputSchema(DownloadAttachmentOutputDataSchema);
