import { z } from 'zod';
import { PageIdSchema, PageAccessOutputSchema } from '#common/schemas/index.js';

export const UpdatePageAccessParamsSchema = z.object({
  idx: PageIdSchema.describe('ID страницы'),
  access_id: z.string().min(1).describe('ID доступа (см. ответ yw_add_page_access)'),
  role: z.enum(['reader', 'editor', 'extra_editor', 'author']).describe('Новая роль доступа'),
  inheritance: z
    .enum(['inherited', 'not_inherited'])
    .optional()
    .describe('Наследование доступа дочерними страницами'),
  prevent_selflock: z
    .boolean()
    .optional()
    .describe(
      'Не дать обновлению отобрать у со-автора чтение или право управлять доступом (default: false)'
    ),
});

export type UpdatePageAccessParams = z.infer<typeof UpdatePageAccessParamsSchema>;

export const UpdatePageAccessOutputDataSchema = z.object({
  idx: z.number(),
  access: PageAccessOutputSchema,
});
