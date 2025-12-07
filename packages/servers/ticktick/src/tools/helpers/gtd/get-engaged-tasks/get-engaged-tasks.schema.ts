/**
 * Schema for GetEngagedTasks tool
 */

import { z } from 'zod';
import { FieldsSchema } from '#tools/shared/index.js';

export const GetEngagedTasksParamsSchema = z.object({
  fields: FieldsSchema.describe('Поля для возврата'),
});

export type GetEngagedTasksParams = z.infer<typeof GetEngagedTasksParamsSchema>;
