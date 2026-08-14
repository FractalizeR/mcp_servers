import { z } from 'zod';
import { collectionResponseModeParamSchema } from '@fractalizer/mcp-core';
import { PageIdSchema } from '#common/schemas/index.js';

export const GetCommentsParamsSchema = z.object({
  idx: PageIdSchema.describe('ID страницы'),
  cursor: z.string().optional().describe('Курсор для пагинации'),
  order_direction: z
    .enum(['asc', 'desc'])
    .optional()
    .describe('Направление сортировки по дате создания (default: asc)'),
  page_size: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Размер страницы (default: 50, max: 100)'),
  status_filter: z
    .enum(['resolved', 'unresolved'])
    .optional()
    .describe('Фильтр по статусу решения комментария'),
  responseMode: collectionResponseModeParamSchema({ itemsNoun: 'комментариев' }),
});

export type GetCommentsParams = z.infer<typeof GetCommentsParamsSchema>;
