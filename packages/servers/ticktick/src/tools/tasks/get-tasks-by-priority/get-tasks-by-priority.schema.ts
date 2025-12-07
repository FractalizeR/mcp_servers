/**
 * Zod schema for GetTasksByPriorityTool parameters
 */

import { z } from 'zod';
import { FieldsSchema, PrioritySchema } from '#common/schemas/index.js';

/**
 * Parameters schema for getting tasks by priority
 */
export const GetTasksByPriorityParamsSchema = z.object({
  priority: PrioritySchema,
  fields: FieldsSchema,
});

/**
 * Type inference from schema
 */
export type GetTasksByPriorityParams = z.infer<typeof GetTasksByPriorityParamsSchema>;
