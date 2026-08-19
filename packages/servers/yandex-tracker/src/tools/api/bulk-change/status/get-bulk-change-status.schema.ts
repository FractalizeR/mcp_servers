/**
 * Zod схема для валидации параметров GetBulkChangeStatusTool
 */

import { z } from 'zod';
import { buildOutputSchema } from '#common/schemas/index.js';

/**
 * Схема параметров для получения статуса bulk операции
 */
export const GetBulkChangeStatusParamsSchema = z.object({
  /**
   * ID операции (возвращается при создании bulk операции)
   */
  operationId: z.string().min(1).describe('ID операции массового изменения'),
});

/**
 * Вывод типа из схемы
 */
export type GetBulkChangeStatusParams = z.infer<typeof GetBulkChangeStatusParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 *
 * Зеркалирует `BulkChangeOperation` (см. `tracker_api/entities/bulk-change.entity.ts`)
 * плюс вычисляемое `message`. Опциональные поля API v2 остаются опциональными.
 */
export const GetBulkChangeStatusOutputDataSchema = z.object({
  operationId: z.string(),
  status: z.string(),
  statusText: z.string().optional(),
  totalIssues: z.number().optional(),
  totalCompletedIssues: z.number().optional(),
  executionChunkPercent: z.number().optional(),
  executionIssuePercent: z.number().optional(),
  createdAt: z.string().optional(),
  createdBy: z
    .object({
      self: z.string(),
      id: z.string(),
      display: z.string(),
    })
    .optional(),
  message: z.string(),
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const GetBulkChangeStatusOutputSchema = buildOutputSchema(
  GetBulkChangeStatusOutputDataSchema
);
