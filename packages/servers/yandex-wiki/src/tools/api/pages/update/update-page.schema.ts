import { z } from 'zod';
import {
  PageIdSchema,
  PageSlugSchema,
  WikiFieldsSchema,
  PageOutputSchema,
} from '#common/schemas/index.js';

const RedirectSchema = z
  .object({
    page: z
      .object({
        id: PageIdSchema.optional().describe('ID страницы — цели редиректа'),
        slug: PageSlugSchema.optional().describe('Slug страницы — цели редиректа'),
      })
      .describe('Целевая страница редиректа (id или slug)'),
  })
  .describe('Сделать из этой страницы редирект на другую');

export const UpdatePageParamsSchema = z.object({
  idx: PageIdSchema,
  title: z.string().min(1).max(255).optional().describe('Новое название (1-255 символов)'),
  content: z
    .string()
    .optional()
    .describe(
      'Новое содержимое (ПОЛНОСТЬЮ заменяет текущее — не патч). ' +
        'Формат: YFM (Yandex Flavored Markdown) — код передаёт строку как есть, без проверки синтаксиса. ' +
        "Для page_type: 'wysiwyg' формат НЕ подтверждён (гипотеза: возможно не YFM, а внутреннее представление редактора) — сверьте результат с веб-интерфейсом перед массовым использованием. " +
        'ПЕРЕД вызовом ОБЯЗАТЕЛЬНО сравните новое содержимое с текущим через yw_diff_page: это единственный способ увидеть, что теряется при перезаписи. ' +
        'У update_page нет recovery_token (в отличие от delete_page) — потеря таблиц (#| ... |#), блоков ({% ... %}) и другой структурной разметки необратима.'
    ),
  redirect: RedirectSchema.optional(),
  allow_merge: z.boolean().optional().describe('Разрешить слияние изменений'),
  fields: WikiFieldsSchema,
  is_silent: z.boolean().optional().describe('Не уведомлять подписчиков'),
});

export type UpdatePageParams = z.infer<typeof UpdatePageParamsSchema>;

export const UpdatePageOutputDataSchema = z.object({
  message: z.string(),
  page: PageOutputSchema,
  /** Пакет 7.1.D: непусто, если перезапись content потенциально теряет YFM-разметку */
  warnings: z.array(z.string()).optional(),
});
