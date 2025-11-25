import { z } from 'zod';
import { PageSlugSchema, WikiFieldsSchema } from '#common/schemas/index.js';

export const GetPageParamsSchema = z.object({
  slug: PageSlugSchema,
  fields: WikiFieldsSchema,
  raise_on_redirect: z
    .boolean()
    .optional()
    .describe('Вернуть ошибку при редиректе (default: false)'),
  revision_id: z.number().int().optional().describe('ID конкретной ревизии страницы'),
});

export type GetPageParams = z.infer<typeof GetPageParamsSchema>;
