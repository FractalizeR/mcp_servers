/**
 * Schema for GetTasksDueInDays tool
 */

import { z } from 'zod';
import { FieldsSchema, TaskEntityOutputSchema } from '#tools/shared/index.js';
import {
  buildCollectionOutputSchema,
  collectionResponseModeParamSchema,
} from '@fractalizer/mcp-core';
export const GetTasksDueInDaysParamsSchema = z.object({
  days: z.number().int().min(1).max(365).describe('Количество дней от сегодня (1-365)'),
  fields: FieldsSchema.describe('Поля для возврата'),
  responseMode: collectionResponseModeParamSchema({ itemsNoun: 'задач' }),
});

export type GetTasksDueInDaysParams = z.infer<typeof GetTasksDueInDaysParamsSchema>;

/**
 * Сводка коллекции (пакет 5.1.C.ticktick).
 */
export const GetTasksDueInDaysSummarySchema = z.object({
  fromDate: z.string(),
  toDate: z.string(),
  daysRange: z.number(),
  fieldsReturned: z.union([z.array(z.string()), z.literal('all')]),
});

/**
 * outputSchema (JSON Schema 2020-12) — describes the whole success envelope,
 * not just `data` (see base-tool.ts SuccessEnvelope).
 */
export const GET_TASKS_DUE_IN_DAYS_OUTPUT_SCHEMA = buildCollectionOutputSchema(
  TaskEntityOutputSchema,
  GetTasksDueInDaysSummarySchema
);
