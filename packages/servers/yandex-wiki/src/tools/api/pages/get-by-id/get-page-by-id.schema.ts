import { z } from 'zod';
import { PageIdSchema, WikiFieldsSchema } from '#common/schemas/index.js';

export const GetPageByIdParamsSchema = z.object({
  idx: PageIdSchema,
  fields: WikiFieldsSchema,
  raise_on_redirect: z
    .boolean()
    .optional()
    .describe('Вернуть ошибку при редиректе (default: false)'),
  revision_id: z.number().int().optional().describe('ID конкретной ревизии страницы'),
});

export type GetPageByIdParams = z.infer<typeof GetPageByIdParamsSchema>;
