/**
 * Zod схема для валидации параметров DemoTool
 *
 * ФИКТИВНЫЙ TOOL для демонстрации удобства масштабирования
 */

import { z } from 'zod';
import { buildOutputSchema } from '#common/schemas/index.js';

export const DemoParamsSchema = z.object({
  message: z.string().min(1).describe('Сообщение для демонстрации'),
});

export type DemoParams = z.infer<typeof DemoParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const DemoOutputDataSchema = z.object({
  status: z.literal('success'),
  message: z.string(),
  timestamp: z.string(),
  info: z.string(),
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const DemoOutputSchema = buildOutputSchema(DemoOutputDataSchema);
