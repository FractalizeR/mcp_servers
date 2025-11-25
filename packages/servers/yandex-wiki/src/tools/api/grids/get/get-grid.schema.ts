import { z } from 'zod';
import { WikiFieldsSchema } from '#common/schemas/index.js';

export const GetGridParamsSchema = z.object({
  idx: z.string().uuid().describe('ID таблицы (UUID)'),
  fields: WikiFieldsSchema,
  filter: z.string().optional().describe('Фильтр строк'),
  only_cols: z.string().optional().describe('Вернуть только указанные колонки (через запятую)'),
  only_rows: z.string().optional().describe('Вернуть только указанные строки (ID через запятую)'),
  sort: z.string().optional().describe('Сортировка (column_slug:asc|desc)'),
});

export type GetGridParams = z.infer<typeof GetGridParamsSchema>;
