/**
 * Zod schema for SearchTasksTool parameters
 */

import { z } from 'zod';
import { TaskEntityOutputSchema } from '#tools/shared/index.js';
import { FieldsSchema } from '#common/schemas/index.js';
import {
  buildCollectionOutputSchema,
  collectionResponseModeParamSchema,
} from '@fractalizer/mcp-core';

/**
 * Parameters schema for searching tasks
 */
export const SearchTasksParamsSchema = z.object({
  query: z
    .string()
    .min(1, 'Search query is required')
    .describe('Поисковый запрос (ищет по заголовку и содержимому)'),
  fields: FieldsSchema,
  responseMode: collectionResponseModeParamSchema({ itemsNoun: 'задач' }),
});

/**
 * Type inference from schema
 */
export type SearchTasksParams = z.infer<typeof SearchTasksParamsSchema>;

/**
 * Сводка коллекции (пакет 5.1.C.ticktick).
 */
export const SearchTasksSummarySchema = z.object({
  query: z.string(),
  fieldsReturned: z.array(z.string()),
});

/**
 * outputSchema (JSON Schema 2020-12) — describes the whole success envelope,
 * not just `data` (see base-tool.ts SuccessEnvelope).
 */
export const SEARCH_TASKS_OUTPUT_SCHEMA = buildCollectionOutputSchema(
  TaskEntityOutputSchema,
  SearchTasksSummarySchema
);
