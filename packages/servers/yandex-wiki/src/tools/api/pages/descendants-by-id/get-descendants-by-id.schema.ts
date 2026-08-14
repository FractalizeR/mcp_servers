import { z } from 'zod';
import { collectionResponseModeParamSchema } from '@fractalizer/mcp-core';
import { PageIdSchema } from '#common/schemas/index.js';

export const GetDescendantsByIdParamsSchema = z.object({
  idx: PageIdSchema.describe('ID родительской страницы раздела'),
  actuality: z.enum(['actual', 'obsolete']).optional().describe('Фильтр по актуальности потомков'),
  cursor: z.string().optional().describe('Курсор для пагинации'),
  include_self: z
    .boolean()
    .optional()
    .describe('Включить саму родительскую страницу в результат (default: false)'),
  page_size: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Размер страницы (default: 50, max: 100)'),
  show_all: z.boolean().optional().describe('Показать все страницы (default: false)'),
  responseMode: collectionResponseModeParamSchema({ itemsNoun: 'страниц поддерева' }),
});

export type GetDescendantsByIdParams = z.infer<typeof GetDescendantsByIdParamsSchema>;
