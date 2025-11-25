import { z } from 'zod';
import { PageSlugSchema, WikiFieldsSchema } from '#common/schemas/index.js';

export const CreatePageParamsSchema = z.object({
  page_type: z.enum(['page', 'grid', 'cloud_page', 'wysiwyg', 'template']).describe('Тип страницы'),
  slug: PageSlugSchema,
  title: z.string().min(1).max(255).describe('Название страницы (1-255 символов)'),
  content: z.string().optional().describe('Содержимое страницы'),
  grid_format: z.enum(['yfm', 'wom', 'plain']).optional().describe('Формат текста для grid'),
  fields: WikiFieldsSchema,
  is_silent: z.boolean().optional().describe('Не уведомлять подписчиков'),
});

export type CreatePageParams = z.infer<typeof CreatePageParamsSchema>;
