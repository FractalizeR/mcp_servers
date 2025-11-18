/**
 * Zod схема для валидации параметров DownloadAttachmentTool
 */

import { z } from 'zod';
import { IssueKeySchema } from '../../../../../common/schemas/index.js';

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
