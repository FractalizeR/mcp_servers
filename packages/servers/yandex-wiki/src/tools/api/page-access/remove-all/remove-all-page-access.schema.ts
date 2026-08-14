import { z } from 'zod';
import { PageIdSchema } from '#common/schemas/index.js';

export const RemoveAllPageAccessParamsSchema = z.object({
  idx: PageIdSchema.describe('ID страницы'),
  prevent_selflock: z
    .boolean()
    .optional()
    .describe(
      'Не дать удалению отобрать у со-автора чтение или право управлять доступом (default: false)'
    ),
});

export type RemoveAllPageAccessParams = z.infer<typeof RemoveAllPageAccessParamsSchema>;

export const RemoveAllPageAccessOutputDataSchema = z.object({
  idx: z.number(),
});
