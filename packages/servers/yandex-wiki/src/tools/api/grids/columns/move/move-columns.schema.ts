import { z } from 'zod';
import { GridOutputSchema } from '#common/schemas/index.js';

export const MoveColumnsParamsSchema = z.object({
  idx: z.string().uuid().describe('ID таблицы (UUID)'),
  column_slug: z.string().describe('Slug колонки для перемещения'),
  position: z.number().int().min(0).describe('Целевая позиция'),
  revision: z.string().optional().describe('Ревизия таблицы'),
  columns_count: z.number().int().min(1).optional().describe('Количество колонок для перемещения'),
});

export type MoveColumnsParams = z.infer<typeof MoveColumnsParamsSchema>;

export const MoveColumnsOutputDataSchema = z.object({
  message: z.string(),
  grid: GridOutputSchema,
});
