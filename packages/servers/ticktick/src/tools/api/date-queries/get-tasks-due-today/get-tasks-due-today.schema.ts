/**
 * Schema for GetTasksDueToday tool
 */

import { z } from 'zod';
import { FieldsSchema } from '#tools/shared/index.js';

export const GetTasksDueTodayParamsSchema = z.object({
  fields: FieldsSchema.describe('Поля для возврата'),
});

export type GetTasksDueTodayParams = z.infer<typeof GetTasksDueTodayParamsSchema>;
