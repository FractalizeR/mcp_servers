import { z } from 'zod';
import { PageIdSchema, PageAccessOutputSchema } from '#common/schemas/index.js';

const UserTargetSchema = z.object({
  user: z.object({
    uid: z.string().optional().describe('UID пользователя (Yandex 360 for Business)'),
    cloud_uid: z.string().optional().describe('Cloud UID пользователя (Yandex Cloud Organization)'),
  }),
});

const GroupTargetSchema = z.object({
  group: z.object({
    src: z.enum(['dir', 'cloud', 'com', 'staff']).describe('Источник группы'),
    id: z.string().describe('ID группы'),
  }),
});

export const AddPageAccessParamsSchema = z.object({
  idx: PageIdSchema.describe('ID страницы'),
  role: z
    .enum(['reader', 'editor', 'extra_editor', 'author'])
    .describe(
      'Роль доступа: reader — чтение, editor — редактирование, extra_editor — расширенное ' +
        'редактирование (управление доступом), author — автор (полный доступ)'
    ),
  target: z
    .union([UserTargetSchema, GroupTargetSchema])
    .describe('Получатель доступа: либо {user:{uid|cloud_uid}}, либо {group:{src,id}}'),
  inheritance: z
    .enum(['inherited', 'not_inherited'])
    .optional()
    .describe('Наследование доступа дочерними страницами'),
});

export type AddPageAccessParams = z.infer<typeof AddPageAccessParamsSchema>;

export const AddPageAccessOutputDataSchema = z.object({
  idx: z.number(),
  access: PageAccessOutputSchema,
});
