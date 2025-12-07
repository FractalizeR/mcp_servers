/**
 * Zod schema for task status filter
 *
 * TickTick uses numeric status values internally:
 * - 0 = uncompleted
 * - 2 = completed
 *
 * For UX, we expose string values in tools.
 */

import { z } from 'zod';

/**
 * Task status filter for queries
 */
export const StatusFilterSchema = z
  .enum(['all', 'uncompleted', 'completed'])
  .default('uncompleted')
  .describe('Filter by task status: all, uncompleted (default), or completed');

export type StatusFilter = z.infer<typeof StatusFilterSchema>;

/**
 * Internal task status values
 */
export const TaskStatusValues = {
  UNCOMPLETED: 0,
  COMPLETED: 2,
} as const;

export type TaskStatusValue = (typeof TaskStatusValues)[keyof typeof TaskStatusValues];
