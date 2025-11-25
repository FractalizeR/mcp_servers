import { z } from 'zod';

export const CloneGridParamsSchema = z.object({
  idx: z.string().uuid().describe('ID таблицы для клонирования (UUID)'),
  target: z.string().describe('Slug целевой страницы'),
  title: z.string().min(1).max(255).optional().describe('Название копии (1-255 символов)'),
  with_data: z.boolean().optional().describe('Копировать с данными (default: false)'),
});

export type CloneGridParams = z.infer<typeof CloneGridParamsSchema>;
