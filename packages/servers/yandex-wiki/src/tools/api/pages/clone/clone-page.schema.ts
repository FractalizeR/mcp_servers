import { z } from 'zod';
import { PageIdSchema, PageSlugSchema } from '#common/schemas/index.js';

export const ClonePageParamsSchema = z.object({
  idx: PageIdSchema,
  target: PageSlugSchema.describe('Целевой slug для копии'),
  title: z.string().min(1).max(255).optional().describe('Название копии (1-255 символов)'),
  subscribe_me: z.boolean().optional().describe('Подписаться на изменения копии'),
});

export type ClonePageParams = z.infer<typeof ClonePageParamsSchema>;

export const ClonePageOutputDataSchema = z.object({
  message: z.string(),
  operation_id: z.string(),
  operation_type: z.string(),
  status_url: z.string(),
  dry_run: z.boolean(),
  hint: z.string(),
});
