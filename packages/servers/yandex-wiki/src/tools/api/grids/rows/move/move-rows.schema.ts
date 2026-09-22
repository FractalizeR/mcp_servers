import { z } from 'zod';
import { buildOptimisticLockDescription } from '@fractalizer/mcp-core';
import { GridOutputSchema } from '#common/schemas/index.js';

export const MoveRowsParamsSchema = z.object({
  idx: z.string().uuid().describe('ID таблицы (UUID)'),
  row_id: z.string().describe('ID строки для перемещения'),
  after_row_id: z.string().optional().describe('ID строки, после которой переместить'),
  position: z.number().int().min(0).optional().describe('Целевая позиция'),
  revision: z
    .string()
    .optional()
    .describe(
      buildOptimisticLockDescription({
        paramName: 'revision',
        source: 'в ответе yw_get_grid',
        conflict: 'unspecified',
      })
    ),
  rows_count: z.number().int().min(1).optional().describe('Количество строк для перемещения'),
});

export type MoveRowsParams = z.infer<typeof MoveRowsParamsSchema>;

export const MoveRowsOutputDataSchema = z.object({
  message: z.string(),
  grid: GridOutputSchema,
});
