/**
 * Schema for GetTasksDueInDays tool
 */

import { z } from 'zod';
import { FieldsSchema } from '#tools/shared/index.js';

export const GetTasksDueInDaysParamsSchema = z.object({
  days: z.number().int().min(1).max(365).describe('Количество дней от сегодня (1-365)'),
  fields: FieldsSchema.describe('Поля для возврата'),
});

export type GetTasksDueInDaysParams = z.infer<typeof GetTasksDueInDaysParamsSchema>;
