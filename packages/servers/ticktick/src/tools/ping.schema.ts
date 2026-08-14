/**
 * Schema для PingTool
 *
 * Пустая schema - параметры не требуются.
 */

import { z } from 'zod';
import { buildSuccessOutputSchema } from '#tools/shared/index.js';

export const PingParamsSchema = z.object({}).describe('Параметры ping (без параметров)');

export type PingParams = z.infer<typeof PingParamsSchema>;

/**
 * Shape of `data` in the success envelope (`{ success: true, data }`).
 *
 * PingTool использует formatSuccess() и для "connected", и для "disconnected"
 * состояния (см. ping.tool.ts) — оба варианта описаны одной permissive-схемой
 * с опциональными полями обеих веток.
 */
export const PingOutputDataSchema = z.object({
  status: z.enum(['connected', 'disconnected']),
  timestamp: z.string(),
  latencyMs: z.number().optional(),
  projectCount: z.number().optional(),
  error: z.string().optional(),
});

/**
 * outputSchema (JSON Schema 2020-12) — описывает весь success envelope, не
 * только `data` (см. base-tool.ts SuccessEnvelope).
 */
export const PING_OUTPUT_SCHEMA = buildSuccessOutputSchema(PingOutputDataSchema);
