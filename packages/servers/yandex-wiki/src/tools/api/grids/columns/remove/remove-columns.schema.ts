import { z } from 'zod';

export const RemoveColumnsParamsSchema = z.object({
  idx: z.string().uuid().describe('ID таблицы (UUID)'),
  column_slugs: z.array(z.string()).min(1).describe('Slugs колонок для удаления'),
  revision: z.string().optional().describe('Ревизия таблицы'),
});

export type RemoveColumnsParams = z.infer<typeof RemoveColumnsParamsSchema>;
