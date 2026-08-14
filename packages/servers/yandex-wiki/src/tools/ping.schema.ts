import { z } from 'zod';

export const PingParamsSchema = z.object({}).describe('Параметры ping (без параметров)');

export type PingParams = z.infer<typeof PingParamsSchema>;

export const PingOutputDataSchema = z.object({
  status: z.literal('ok'),
  message: z.string(),
  responseTimeMs: z.number().optional(),
  timestamp: z.string(),
});
