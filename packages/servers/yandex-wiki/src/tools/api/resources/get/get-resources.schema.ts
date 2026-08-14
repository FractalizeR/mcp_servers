import { z } from 'zod';
import { collectionResponseModeParamSchema } from '@fractalizer/mcp-core';
import { PageIdSchema, ResourceOutputSchema } from '#common/schemas/index.js';

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
  responseMode: collectionResponseModeParamSchema({ itemsNoun: 'ресурсов' }),
});

export type GetResourcesParams = z.infer<typeof GetResourcesParamsSchema>;

/**
 * Схема поля `summary` результата (пакет 5.1.C.wiki).
 *
 * `gridItems` — таблицы (grid) страницы, ВСЕГДА полностью инлайн, вне
 * механизма `responseMode`/ResourceLink: динамические таблицы заморожены
 * решением этапа 7.1, план прямо запрещает расширять на них Resources —
 * см. `#resources/wiki-page-item-resource.provider.ts`.
 */
export const GetResourcesSummarySchema = z.object({
  gridItems: z.array(ResourceOutputSchema),
  next_cursor: z.string().optional(),
  prev_cursor: z.string().optional(),
});

export type GetResourcesSummary = z.infer<typeof GetResourcesSummarySchema>;
