import { z } from 'zod';

const ColumnTypeSchema = z.enum([
  'string',
  'number',
  'date',
  'select',
  'staff',
  'checkbox',
  'ticket',
  'ticket_field',
]);

const BGColorSchema = z.enum([
  'blue',
  'yellow',
  'pink',
  'red',
  'green',
  'mint',
  'grey',
  'orange',
  'magenta',
  'purple',
  'copper',
  'ocean',
]);

const TextFormatSchema = z.enum(['yfm', 'wom', 'plain']);

const ColumnSchema = z.object({
  title: z.string().describe('Название колонки'),
  slug: z.string().describe('Slug колонки'),
  type: ColumnTypeSchema.describe('Тип колонки'),
  required: z.boolean().describe('Обязательная колонка'),
  color: BGColorSchema.optional().describe('Цвет фона заголовка'),
  width: z.number().optional().describe('Ширина колонки'),
  width_units: z.enum(['%', 'px']).optional().describe('Единицы ширины'),
  pinned: z.enum(['left', 'right']).optional().describe('Закрепление колонки'),
  format: TextFormatSchema.optional().describe('Формат текста'),
  multiple: z.boolean().optional().describe('Множественный выбор (для select)'),
  select_options: z.array(z.string()).optional().describe('Опции для select'),
  description: z.string().optional().describe('Описание колонки'),
});

export const AddColumnsParamsSchema = z.object({
  idx: z.string().uuid().describe('ID таблицы (UUID)'),
  columns: z.array(ColumnSchema).min(1).describe('Колонки для добавления'),
  revision: z.string().optional().describe('Ревизия таблицы'),
  position: z.number().int().min(0).optional().describe('Позиция вставки (0 - в начало)'),
});

export type AddColumnsParams = z.infer<typeof AddColumnsParamsSchema>;
