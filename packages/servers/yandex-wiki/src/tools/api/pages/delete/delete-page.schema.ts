import { z } from 'zod';
import { PageIdSchema } from '#common/schemas/index.js';

export const DeletePageParamsSchema = z.object({
  idx: PageIdSchema,
  allow_recursive: z
    .boolean()
    .optional()
    .describe('Разрешить удаление страницы вместе с дочерними (default: false)'),
  recursive: z
    .boolean()
    .optional()
    .describe('Рекурсивное удаление дочерних страниц (default: false)'),
});

export type DeletePageParams = z.infer<typeof DeletePageParamsSchema>;

export const DeletePageOutputDataSchema = z.object({
  message: z.string(),
  recovery_token: z.string(),
  hint: z.string(),
});
