import { z } from 'zod';
import { PageIdSchema, WikiFieldsSchema } from '#common/schemas/index.js';

const InsertLocationSchema = z.enum(['top', 'bottom']).describe('Позиция вставки');

export const AppendContentParamsSchema = z.object({
  idx: PageIdSchema,
  content: z.string().min(1).describe('Контент для добавления'),
  body_location: InsertLocationSchema.optional().describe('Вставка в тело страницы'),
  section_id: z.number().int().optional().describe('ID секции для вставки'),
  section_location: InsertLocationSchema.optional().describe('Позиция в секции'),
  anchor_name: z.string().optional().describe('Имя якоря для вставки'),
  anchor_fallback: z.boolean().optional().describe('Использовать fallback если якорь не найден'),
  anchor_regex: z.boolean().optional().describe('Интерпретировать имя якоря как regex'),
  fields: WikiFieldsSchema,
  is_silent: z.boolean().optional().describe('Не уведомлять подписчиков'),
});

export type AppendContentParams = z.infer<typeof AppendContentParamsSchema>;
