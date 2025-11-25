import { z } from 'zod';
import { PageIdSchema } from '#common/schemas/index.js';

export const CreateGridParamsSchema = z.object({
  title: z.string().min(1).max(255).describe('Название таблицы (1-255 символов)'),
  page_id: PageIdSchema.optional().describe('ID страницы для таблицы'),
  page_slug: z.string().optional().describe('Slug страницы для таблицы'),
});

export type CreateGridParams = z.infer<typeof CreateGridParamsSchema>;
