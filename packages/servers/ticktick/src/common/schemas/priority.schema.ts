/**
 * Zod schema for task priority
 *
 * TickTick uses numeric priority values:
 * - 0 = none/no priority
 * - 1 = low priority
 * - 3 = medium priority
 * - 5 = high priority
 */

import { z } from 'zod';

/**
 * Task priority schema
 */
export const PrioritySchema = z
  .number()
  .int('Priority must be an integer')
  .refine((val) => [0, 1, 3, 5].includes(val), {
    message: 'Priority must be 0 (none), 1 (low), 3 (medium), or 5 (high)',
  })
  .describe('Task priority: 0=none, 1=low, 3=medium, 5=high');

export type Priority = z.infer<typeof PrioritySchema>;

/**
 * Optional priority schema
 */
export const OptionalPrioritySchema = PrioritySchema.optional();

export type OptionalPriority = z.infer<typeof OptionalPrioritySchema>;
