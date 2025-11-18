/**
 * Zod схема для валидации параметров GetThumbnailTool
 */

import { z } from 'zod';
import { IssueKeySchema } from '../../../../../common/schemas/index.js';

/**
 * Схема параметров для получения миниатюры изображения
 */
export const GetThumbnailParamsSchema = z.object({
  /**
   * Ключ или ID задачи
   */
  issueId: IssueKeySchema,

  /**
   * ID прикрепленного файла (должно быть изображение)
   */
  attachmentId: z.string().min(1, 'ID файла обязателен'),

  /**
   * Путь для сохранения миниатюры (опционально)
   * Если не указан, вернется base64
   */
  saveToPath: z.string().optional(),
});

/**
 * Вывод типа из схемы
 */
export type GetThumbnailParams = z.infer<typeof GetThumbnailParamsSchema>;
