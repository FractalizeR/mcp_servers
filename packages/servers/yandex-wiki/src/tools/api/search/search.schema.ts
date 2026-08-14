import { z } from 'zod';
import { collectionResponseModeParamSchema } from '@fractalizer/mcp-core';

const SearchAuthorSchema = z.object({
  uid: z.string().optional().describe('UID автора (Yandex 360 for Business)'),
  cloud_uid: z.string().optional().describe('Cloud UID автора (Yandex Cloud Organization)'),
});

const SearchDateIntervalSchema = z.object({
  from: z.string().optional().describe('Начало периода (ISO 8601 datetime)'),
  to: z.string().optional().describe('Конец периода (ISO 8601 datetime)'),
});

const SearchFiltersSchema = z.object({
  type: z.enum(['file', 'page']).optional().describe('Ограничить тип результата'),
  authors: z.array(SearchAuthorSchema).optional().describe('Фильтр по авторам'),
  cluster: z.string().min(1).max(255).optional().describe('Фильтр по кластеру/разделу Wiki'),
  created_at: SearchDateIntervalSchema.optional().describe('Фильтр по дате создания'),
  modified_at: SearchDateIntervalSchema.optional().describe('Фильтр по дате изменения'),
  show_obsolete: z.boolean().optional().describe('Включать устаревшие страницы (default: false)'),
});

export const SearchParamsSchema = z.object({
  query: z.string().min(1).describe('Поисковый запрос (полнотекстовый)'),
  cursor: z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .describe('Курсор страницы результатов (default: 1)'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe('Количество результатов на странице (default: 10, max: 50)'),
  order_by: z
    .enum(['relevancy', 'creation_date', 'modified_date'])
    .optional()
    .describe('Порядок сортировки результатов (default: relevancy)'),
  highlight: z
    .boolean()
    .optional()
    .describe('Подсветить фрагменты текста, совпадающие с запросом (default: false)'),
  filters: SearchFiltersSchema.optional().describe('Дополнительные фильтры поиска'),
  responseMode: collectionResponseModeParamSchema({ itemsNoun: 'результатов поиска' }),
});

export type SearchParams = z.infer<typeof SearchParamsSchema>;
