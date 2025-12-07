/**
 * Zod schema for GetAllTasksTool parameters
 */

import { z } from 'zod';
import { FieldsSchema, StatusFilterSchema } from '#common/schemas/index.js';

/**
 * Parameters schema for getting all tasks
 */
export const GetAllTasksParamsSchema = z.object({
  fields: FieldsSchema,
  status: StatusFilterSchema,
});

/**
 * Type inference from schema
 */
export type GetAllTasksParams = z.infer<typeof GetAllTasksParamsSchema>;
