/**
 * Zod схема для валидации параметров UploadAttachmentTool
 */

import { z } from 'zod';
import { IssueKeySchema } from '../../../../../common/schemas/index.js';

/**
 * Схема параметров для загрузки файла в задачу
 */
export const UploadAttachmentParamsSchema = z
  .object({
    /**
     * Ключ или ID задачи для загрузки файла
     */
    issueId: IssueKeySchema,

    /**
     * Имя файла (с расширением)
     */
    filename: z.string().min(1, 'Имя файла обязательно').max(255, 'Имя файла слишком длинное'),

    /**
     * Содержимое файла в base64 (приоритет выше filePath)
     */
    fileContent: z.string().optional(),

    /**
     * Путь к файлу (используется если fileContent не указан)
     */
    filePath: z.string().optional(),

    /**
     * MIME тип файла (опционально, определится автоматически)
     */
    mimetype: z.string().optional(),
  })
  .refine((data) => data.fileContent || data.filePath, {
    message: 'Необходимо указать либо fileContent (base64), либо filePath',
  });

/**
 * Вывод типа из схемы
 */
export type UploadAttachmentParams = z.infer<typeof UploadAttachmentParamsSchema>;
