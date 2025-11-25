import { z } from 'zod';

const SortConfigSchema = z.object({
  column_slug: z.string().describe('Slug колонки для сортировки'),
  direction: z.enum(['asc', 'desc']).describe('Направление сортировки'),
});

export const UpdateGridParamsSchema = z.object({
  idx: z.string().uuid().describe('ID таблицы (UUID)'),
  revision: z.string().describe('Текущая ревизия таблицы'),
  title: z.string().min(1).max(255).optional().describe('Новое название таблицы'),
  default_sort: z.array(SortConfigSchema).optional().describe('Сортировка по умолчанию'),
});

export type UpdateGridParams = z.infer<typeof UpdateGridParamsSchema>;
