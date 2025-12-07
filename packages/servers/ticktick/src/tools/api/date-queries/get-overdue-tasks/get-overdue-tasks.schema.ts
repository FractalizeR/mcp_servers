/**
 * Schema for GetOverdueTasks tool
 */

import { z } from 'zod';
import { FieldsSchema } from '#tools/shared/index.js';

export const GetOverdueTasksParamsSchema = z.object({
  fields: FieldsSchema.describe('Поля для возврата'),
});

export type GetOverdueTasksParams = z.infer<typeof GetOverdueTasksParamsSchema>;
