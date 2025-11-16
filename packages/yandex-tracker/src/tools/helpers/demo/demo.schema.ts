/**
 * Zod схема для валидации параметров DemoTool
 *
 * ФИКТИВНЫЙ TOOL для демонстрации удобства масштабирования
 */

import { z } from 'zod';

export const DemoParamsSchema = z.object({
  message: z.string().min(1).describe('Сообщение для демонстрации'),
});

export type DemoParams = z.infer<typeof DemoParamsSchema>;
