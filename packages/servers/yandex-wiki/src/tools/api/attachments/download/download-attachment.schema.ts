import { z } from 'zod';
import { PageIdSchema } from '#common/schemas/index.js';

export const DownloadAttachmentParamsSchema = z.object({
  idx: PageIdSchema.describe('ID страницы, к которой прикреплён файл'),
  file_id: z
    .number()
    .int()
    .positive()
    .describe('ID вложения (см. yw_get_resources с types=["attachment"])'),
  saveToPath: z
    .string()
    .optional()
    .describe('Путь для сохранения файла на диск сервера. Если не указан — вернётся base64.'),
});

export type DownloadAttachmentParams = z.infer<typeof DownloadAttachmentParamsSchema>;

export const DownloadAttachmentOutputDataSchema = z.object({
  idx: z.number(),
  file_id: z.number(),
  size: z.number(),
  contentType: z.string().optional(),
  savedTo: z.string().optional(),
  base64: z.string().optional(),
});
