/**
 * Schema for GetTasksDueThisWeek tool
 */

import { z } from 'zod';
import { FieldsSchema } from '#tools/shared/index.js';

export const GetTasksDueThisWeekParamsSchema = z.object({
  fields: FieldsSchema.describe('Поля для возврата'),
});

export type GetTasksDueThisWeekParams = z.infer<typeof GetTasksDueThisWeekParamsSchema>;
