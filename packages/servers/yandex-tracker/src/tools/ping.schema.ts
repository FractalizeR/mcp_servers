/**
 * Zod схема для валидации параметров PingTool
 *
 * Ping не требует параметров
 */

import { z } from 'zod';
import { buildOutputSchema } from '#common/schemas/index.js';

/**
 * Схема параметров для ping (пустая)
 */
export const PingParamsSchema = z.object({});

/**
 * Тип параметров из схемы
 */
export type PingParams = z.infer<typeof PingParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const PingOutputDataSchema = z.object({
  message: z.string(),
  timestamp: z.string(),
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const PingOutputSchema = buildOutputSchema(PingOutputDataSchema);
