/**
 * Zod schema for SearchTasksTool parameters
 */

import { z } from 'zod';
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
