/**
 * Zod схема для валидации параметров GetBulkChangeStatusTool
 */

import { z } from 'zod';

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
