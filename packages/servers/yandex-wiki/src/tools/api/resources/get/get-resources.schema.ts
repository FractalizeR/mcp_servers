import { z } from 'zod';
import { PageIdSchema } from '#common/schemas/index.js';

const ResourceTypeSchema = z.enum(['attachment', 'grid', 'sharepoint_resource']);

export const GetResourcesParamsSchema = z.object({
  idx: PageIdSchema.describe('ID страницы'),
  cursor: z.string().optional().describe('Курсор для пагинации'),
  order_by: z.enum(['name_title', 'created_at']).optional().describe('Поле сортировки'),
  order_direction: z.enum(['asc', 'desc']).optional().describe('Направление сортировки'),
  page_id: z.number().int().min(1).optional().describe('Номер страницы (default: 1)'),
  page_size: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe('Размер страницы (default: 25, max: 50)'),
  q: z.string().optional().describe('Поиск по названию'),
  types: z.array(ResourceTypeSchema).optional().describe('Типы ресурсов'),
});

export type GetResourcesParams = z.infer<typeof GetResourcesParamsSchema>;
