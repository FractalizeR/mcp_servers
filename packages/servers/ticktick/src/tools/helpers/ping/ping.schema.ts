/**
 * Schema for Ping tool
 *
 * Empty schema - no parameters required.
 */

import { z } from 'zod';

export const PingParamsSchema = z.object({});

export type PingParams = z.infer<typeof PingParamsSchema>;
