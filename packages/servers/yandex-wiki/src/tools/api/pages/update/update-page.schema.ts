import { z } from 'zod';
import { PageIdSchema, WikiFieldsSchema } from '#common/schemas/index.js';

export const UpdatePageParamsSchema = z.object({
  idx: PageIdSchema,
  title: z.string().min(1).max(255).optional().describe('Новое название (1-255 символов)'),
  content: z.string().optional().describe('Новое содержимое'),
  allow_merge: z.boolean().optional().describe('Разрешить слияние изменений'),
  fields: WikiFieldsSchema,
  is_silent: z.boolean().optional().describe('Не уведомлять подписчиков'),
});

export type UpdatePageParams = z.infer<typeof UpdatePageParamsSchema>;
