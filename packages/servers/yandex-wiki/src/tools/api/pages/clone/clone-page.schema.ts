import { z } from 'zod';
import { PageIdSchema, PageSlugSchema } from '#common/schemas/index.js';

export const ClonePageParamsSchema = z.object({
  idx: PageIdSchema,
  target: PageSlugSchema.describe('Целевой slug для копии'),
  title: z.string().min(1).max(255).optional().describe('Название копии (1-255 символов)'),
  subscribe_me: z.boolean().optional().describe('Подписаться на изменения копии'),
});

export type ClonePageParams = z.infer<typeof ClonePageParamsSchema>;
