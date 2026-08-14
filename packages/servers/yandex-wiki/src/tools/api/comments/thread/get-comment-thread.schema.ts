import { z } from 'zod';
import { collectionResponseModeParamSchema } from '@fractalizer/mcp-core';
import { PageIdSchema } from '#common/schemas/index.js';

export const GetCommentThreadParamsSchema = z.object({
  idx: PageIdSchema.describe('ID страницы'),
  comment_id: z.number().int().positive().describe('ID корневого комментария треда'),
  cursor: z.string().optional().describe('Курсор для пагинации'),
  page_size: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Размер страницы (default: 50, max: 100)'),
  responseMode: collectionResponseModeParamSchema({ itemsNoun: 'комментариев треда' }),
});

export type GetCommentThreadParams = z.infer<typeof GetCommentThreadParamsSchema>;
