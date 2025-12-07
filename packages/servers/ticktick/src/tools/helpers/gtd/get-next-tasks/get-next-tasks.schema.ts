/**
 * Schema for GetNextTasks tool
 */

import { z } from 'zod';
import { FieldsSchema } from '#tools/shared/index.js';

export const GetNextTasksParamsSchema = z.object({
  fields: FieldsSchema.describe('Поля для возврата'),
});

export type GetNextTasksParams = z.infer<typeof GetNextTasksParamsSchema>;
