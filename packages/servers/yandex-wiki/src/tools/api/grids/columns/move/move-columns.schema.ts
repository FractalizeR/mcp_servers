import { z } from 'zod';

export const MoveColumnsParamsSchema = z.object({
  idx: z.string().uuid().describe('ID таблицы (UUID)'),
  column_slug: z.string().describe('Slug колонки для перемещения'),
  position: z.number().int().min(0).describe('Целевая позиция'),
  revision: z.string().optional().describe('Ревизия таблицы'),
  columns_count: z.number().int().min(1).optional().describe('Количество колонок для перемещения'),
});

export type MoveColumnsParams = z.infer<typeof MoveColumnsParamsSchema>;
