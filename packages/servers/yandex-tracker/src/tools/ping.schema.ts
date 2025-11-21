/**
 * Zod схема для валидации параметров PingTool
 *
 * Ping не требует параметров
 */

import { z } from 'zod';

/**
 * Схема параметров для ping (пустая)
 */
export const PingParamsSchema = z.object({});

/**
 * Тип параметров из схемы
 */
export type PingParams = z.infer<typeof PingParamsSchema>;
