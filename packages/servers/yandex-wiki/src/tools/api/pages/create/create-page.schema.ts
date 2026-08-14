import { z } from 'zod';
import { PageSlugSchema, WikiFieldsSchema, PageOutputSchema } from '#common/schemas/index.js';

export const CreatePageParamsSchema = z.object({
  page_type: z
    .enum(['page', 'grid', 'cloud_page', 'wysiwyg', 'template'])
    .describe(
      'Тип страницы. Определяет ожидаемый формат content: page/cloud_page/template — YFM (Yandex Flavored Markdown). ' +
        'wysiwyg — формат НЕ подтверждён (гипотеза: возможно не YFM, а внутреннее представление редактора), проверьте результат в веб-интерфейсе перед массовым использованием. ' +
        'grid — content не используется, таблица создаётся отдельно через yw_create_grid.'
    ),
  slug: PageSlugSchema,
  title: z.string().min(1).max(255).describe('Название страницы (1-255 символов)'),
  content: z
    .string()
    .optional()
    .describe(
      'Содержимое страницы. Формат зависит от page_type — см. описание этого поля. ' +
        'Код передаёт строку как есть, без проверки синтаксиса YFM.'
    ),
  grid_format: z
    .enum(['yfm', 'wom', 'plain'])
    .optional()
    .describe(
      "Формат текста ячеек: применяется только при page_type: 'grid'. " +
        "'yfm' — Yandex Flavored Markdown, 'wom' — WYSIWYG-совместимая разметка, 'plain' — без разметки."
    ),
  fields: WikiFieldsSchema,
  is_silent: z.boolean().optional().describe('Не уведомлять подписчиков'),
});

export type CreatePageParams = z.infer<typeof CreatePageParamsSchema>;

export const CreatePageOutputDataSchema = z.object({
  message: z.string(),
  page: PageOutputSchema,
});
