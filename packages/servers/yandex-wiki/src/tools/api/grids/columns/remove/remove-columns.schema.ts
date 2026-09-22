import { z } from 'zod';
import { buildOptimisticLockDescription } from '@fractalizer/mcp-core';
import { GridOutputSchema } from '#common/schemas/index.js';

export const RemoveColumnsParamsSchema = z.object({
  idx: z.string().uuid().describe('ID таблицы (UUID)'),
  column_slugs: z.array(z.string()).min(1).describe('Slugs колонок для удаления'),
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
});

export type RemoveColumnsParams = z.infer<typeof RemoveColumnsParamsSchema>;

export const RemoveColumnsOutputDataSchema = z.object({
  message: z.string(),
  grid: GridOutputSchema,
});
