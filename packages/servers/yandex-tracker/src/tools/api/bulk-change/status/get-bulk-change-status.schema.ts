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
  type: z.string().optional(),
  progress: z.number(),
  totalIssues: z.number().optional(),
  processedIssues: z.number().optional(),
  failedIssues: z.number().optional(),
  createdAt: z.string().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  errors: z
    .array(
      z.object({
        errorCode: z.string().optional(),
        message: z.string().optional(),
        issueKey: z.string().optional(),
      })
    )
    .optional(),
  errorsCount: z.number().optional(),
  parameters: z
    .object({
      queue: z.string().optional(),
      transition: z.string().optional(),
      values: z.record(z.string(), z.unknown()).optional(),
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
