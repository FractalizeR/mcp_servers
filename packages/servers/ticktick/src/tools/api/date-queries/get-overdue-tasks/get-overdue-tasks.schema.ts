/**
 * Schema for GetOverdueTasks tool
 */

import { z } from 'zod';
import { FieldsSchema, TaskEntityOutputSchema } from '#tools/shared/index.js';
import {
  buildCollectionOutputSchema,
  collectionResponseModeParamSchema,
} from '@fractalizer/mcp-core';
export const GetOverdueTasksParamsSchema = z.object({
  fields: FieldsSchema.describe('Поля для возврата'),
  responseMode: collectionResponseModeParamSchema({ itemsNoun: 'задач' }),
});

export type GetOverdueTasksParams = z.infer<typeof GetOverdueTasksParamsSchema>;

/**
 * Сводка коллекции (пакет 5.1.C.ticktick).
 */
export const GetOverdueTasksSummarySchema = z.object({
  asOf: z.string(),
  fieldsReturned: z.union([z.array(z.string()), z.literal('all')]),
  note: z.string(),
});

/**
 * outputSchema (JSON Schema 2020-12) — describes the whole success envelope,
 * not just `data` (see base-tool.ts SuccessEnvelope).
 */
export const GET_OVERDUE_TASKS_OUTPUT_SCHEMA = buildCollectionOutputSchema(
  TaskEntityOutputSchema,
  GetOverdueTasksSummarySchema
);
