import { z } from 'zod';
import { PageIdSchema } from '#common/schemas/index.js';

export const RemovePageAccessParamsSchema = z.object({
  idx: PageIdSchema.describe('ID страницы'),
  access_id: z.string().min(1).describe('ID удаляемого доступа (см. ответ yw_add_page_access)'),
  prevent_selflock: z
    .boolean()
    .optional()
    .describe(
      'Не дать удалению отобрать у со-автора чтение или право управлять доступом (default: false)'
    ),
});

export type RemovePageAccessParams = z.infer<typeof RemovePageAccessParamsSchema>;

export const RemovePageAccessOutputDataSchema = z.object({
  idx: z.number(),
  access_id: z.string(),
});
