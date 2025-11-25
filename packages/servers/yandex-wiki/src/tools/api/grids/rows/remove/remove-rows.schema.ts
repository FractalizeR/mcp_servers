import { z } from 'zod';

export const RemoveRowsParamsSchema = z.object({
  idx: z.string().uuid().describe('ID таблицы (UUID)'),
  row_ids: z.array(z.string()).min(1).describe('ID строк для удаления'),
  revision: z.string().optional().describe('Ревизия таблицы'),
});

export type RemoveRowsParams = z.infer<typeof RemoveRowsParamsSchema>;
