import { z } from 'zod';
import { GridOutputSchema } from '#common/schemas/index.js';

const CellUpdateSchema = z.object({
  row_id: z.number().describe('ID строки'),
  column_slug: z.string().describe('Slug колонки'),
  value: z.unknown().describe('Новое значение ячейки'),
});

export const UpdateCellsParamsSchema = z.object({
  idx: z.string().uuid().describe('ID таблицы (UUID)'),
  cells: z.array(CellUpdateSchema).min(1).describe('Ячейки для обновления'),
  revision: z.string().optional().describe('Ревизия таблицы'),
});

export type UpdateCellsParams = z.infer<typeof UpdateCellsParamsSchema>;

export const UpdateCellsOutputDataSchema = z.object({
  message: z.string(),
  grid: GridOutputSchema,
});
