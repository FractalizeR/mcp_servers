import { z } from 'zod';
import { PageIdSchema, AttachmentOutputSchema } from '#common/schemas/index.js';
import { MAX_ATTACHMENT_SIZE } from '#constants';

export const UploadAttachmentParamsSchema = z.object({
  idx: PageIdSchema.describe('ID страницы, к которой прикрепляется файл'),
  filename: z.string().min(1).max(255).describe('Имя файла (с расширением)'),
  fileContent: z
    .string()
    .min(1)
    .describe(
      `Содержимое файла в base64. Ограничение размера: ${MAX_ATTACHMENT_SIZE} байт (10 МБ) ` +
        'после декодирования — см. описание инструмента.'
    ),
});

export type UploadAttachmentParams = z.infer<typeof UploadAttachmentParamsSchema>;

export const UploadAttachmentOutputDataSchema = z.object({
  idx: z.number(),
  attachment: AttachmentOutputSchema,
});
