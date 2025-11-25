import { z } from 'zod';

export const MoveRowsParamsSchema = z.object({
  idx: z.string().uuid().describe('ID таблицы (UUID)'),
  row_id: z.string().describe('ID строки для перемещения'),
  after_row_id: z.string().optional().describe('ID строки, после которой переместить'),
  position: z.number().int().min(0).optional().describe('Целевая позиция'),
  revision: z.string().optional().describe('Ревизия таблицы'),
  rows_count: z.number().int().min(1).optional().describe('Количество строк для перемещения'),
});

export type MoveRowsParams = z.infer<typeof MoveRowsParamsSchema>;
