/**
 * Schema для PingTool
 *
 * Пустая schema - параметры не требуются.
 */

import { z } from 'zod';

export const PingParamsSchema = z.object({}).describe('Параметры ping (без параметров)');

export type PingParams = z.infer<typeof PingParamsSchema>;
