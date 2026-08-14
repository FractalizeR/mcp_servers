import { z } from 'zod';
import { PageIdSchema, WikiFieldsSchema, PageOutputSchema } from '#common/schemas/index.js';

const InsertLocationSchema = z.enum(['top', 'bottom']).describe('Позиция вставки');

export const AppendContentParamsSchema = z
  .object({
    idx: PageIdSchema,
    content: z
      .string()
      .min(1)
      .describe(
        'Контент для добавления (YFM — Yandex Flavored Markdown; для page_type: wysiwyg формат не подтверждён, см. yw_update_page). ' +
          'Только ДОБАВЛЯЕТ текст к существующему содержимому — не заменяет его, поэтому сама операция не может потерять уже имеющуюся разметку.'
      ),
    body_location: InsertLocationSchema.optional().describe('Вставка в тело страницы'),
    section_id: z
      .number()
      .int()
      .optional()
      .describe('ID секции для вставки (обязательно вместе с section_location)'),
    section_location: InsertLocationSchema.optional().describe(
      'Позиция в секции (обязательно вместе с section_id)'
    ),
    anchor_name: z.string().optional().describe('Имя якоря для вставки'),
    anchor_fallback: z.boolean().optional().describe('Использовать fallback если якорь не найден'),
    anchor_regex: z.boolean().optional().describe('Интерпретировать имя якоря как regex'),
    fields: WikiFieldsSchema,
    is_silent: z.boolean().optional().describe('Не уведомлять подписчиков'),
  })
  // Дефект 7.1.B №6: раньше таргетинг на секцию собирался кодом инструмента
  // через `if (section_id !== undefined && section_location)` — при частичном
  // заполнении пары условие тихо не срабатывало, и контент дописывался без
  // таргетинга, без единой ошибки валидации. Перенесено в схему: оба поля
  // либо заданы вместе, либо оба отсутствуют.
  .superRefine((data, ctx) => {
    const hasSectionId = data.section_id !== undefined;
    const hasSectionLocation = data.section_location !== undefined;
    if (hasSectionId !== hasSectionLocation) {
      const message =
        'section_id и section_location должны быть заданы вместе — иначе таргетинг на секцию молча теряется';
      ctx.addIssue({ code: 'custom', message, path: ['section_id'] });
      ctx.addIssue({ code: 'custom', message, path: ['section_location'] });
    }
  });

export type AppendContentParams = z.infer<typeof AppendContentParamsSchema>;

export const AppendContentOutputDataSchema = z.object({
  message: z.string(),
  page: PageOutputSchema,
});
