/**
 * Schema for GetTasksDueTomorrow tool
 */

import { z } from 'zod';
import { FieldsSchema } from '#tools/shared/index.js';

export const GetTasksDueTomorrowParamsSchema = z.object({
  fields: FieldsSchema.describe('Поля для возврата'),
});

export type GetTasksDueTomorrowParams = z.infer<typeof GetTasksDueTomorrowParamsSchema>;
