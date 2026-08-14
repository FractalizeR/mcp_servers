/**
 * Zod schema for SearchTasksTool parameters
 */

import { z } from 'zod';
import { TaskEntityOutputSchema, buildSuccessOutputSchema } from '#tools/shared/index.js';
import { FieldsSchema } from '#common/schemas/index.js';

/**
 * Parameters schema for searching tasks
 */
export const SearchTasksParamsSchema = z.object({
  query: z
    .string()
    .min(1, 'Search query is required')
    .describe('Search query (searches in title and content)'),
  fields: FieldsSchema,
});

/**
 * Type inference from schema
 */
export type SearchTasksParams = z.infer<typeof SearchTasksParamsSchema>;

/**
 * Shape of `data` in the success envelope (`{ success: true, data }`)
 */
export const SearchTasksOutputDataSchema = z.object({
  query: z.string(),
  total: z.number(),
  tasks: z.array(TaskEntityOutputSchema),
  fieldsReturned: z.array(z.string()),
});

/**
 * outputSchema (JSON Schema 2020-12) — describes the whole success envelope,
 * not just `data` (see base-tool.ts SuccessEnvelope).
 */
export const SEARCH_TASKS_OUTPUT_SCHEMA = buildSuccessOutputSchema(SearchTasksOutputDataSchema);
