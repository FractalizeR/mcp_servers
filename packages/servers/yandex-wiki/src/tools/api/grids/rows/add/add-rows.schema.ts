import { z } from 'zod';

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

const RowDataSchema = z.object({
  row: z.array(z.unknown()).describe('Значения ячеек строки'),
  pinned: z.boolean().optional().describe('Закрепить строку'),
  color: BGColorSchema.optional().describe('Цвет фона строки'),
});

export const AddRowsParamsSchema = z.object({
  idx: z.string().uuid().describe('ID таблицы (UUID)'),
  rows: z.array(RowDataSchema).min(1).describe('Данные строк для добавления'),
  revision: z.string().optional().describe('Ревизия таблицы'),
  position: z.number().int().min(0).optional().describe('Позиция вставки (0 - в начало)'),
  after_row_id: z.string().optional().describe('ID строки, после которой вставить'),
});

export type AddRowsParams = z.infer<typeof AddRowsParamsSchema>;
