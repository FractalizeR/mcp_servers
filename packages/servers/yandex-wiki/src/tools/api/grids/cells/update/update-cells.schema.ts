import { z } from 'zod';
import { GridOutputSchema } from '#common/schemas/index.js';

const CellUpdateSchema = z.object({
  // API отдаёт id строки как строку ({"rows":[{"id":"1"}]}) — проверено живым
  // запросом 2026-08-14, см. inventory/table5-wiki-api-coverage.md. Тип
  // согласован с remove-rows.schema.ts и move-rows.schema.ts.
  row_id: z.string().describe('ID строки (строка — как в ответе yw_get_grid)'),
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
