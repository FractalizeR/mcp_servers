/**
 * Zod схема для валидации параметров GetThumbnailTool
 */

import { z } from 'zod';
import { IssueKeySchema, buildOutputSchema } from '#common/schemas/index.js';

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

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 *
 * Ровно одно из `savedTo`/`base64` присутствует (см. tool.ts).
 */
export const GetThumbnailOutputDataSchema = z.object({
  issueId: z.string(),
  attachmentId: z.string(),
  size: z.number(),
  mimetype: z.string(),
  savedTo: z.string().optional(),
  base64: z.string().optional(),
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const GetThumbnailOutputSchema = buildOutputSchema(GetThumbnailOutputDataSchema);
