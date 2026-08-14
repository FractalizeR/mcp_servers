/**
 * Zod схема для валидации параметров UploadAttachmentTool
 */

import { z } from 'zod';
import {
  IssueKeySchema,
  FieldsSchema,
  FilteredEntitySchema,
  FieldsReturnedSchema,
  buildOutputSchema,
} from '#common/schemas/index.js';

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

    /**
     * Массив полей для возврата в результате (обязательный)
     * Примеры: ['id', 'name', 'size'], ['id', 'name', 'createdBy.display']
     */
    fields: FieldsSchema,
  })
  .refine((data) => data.fileContent || data.filePath, {
    message: 'Необходимо указать либо fileContent (base64), либо filePath',
  });

/**
 * Вывод типа из схемы
 */
export type UploadAttachmentParams = z.infer<typeof UploadAttachmentParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const UploadAttachmentOutputDataSchema = z.object({
  issueId: z.string(),
  attachment: FilteredEntitySchema,
  fieldsReturned: FieldsReturnedSchema,
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const UploadAttachmentOutputSchema = buildOutputSchema(UploadAttachmentOutputDataSchema);
