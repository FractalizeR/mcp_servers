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
  .describe('Фильтр по статусу задачи: all, uncompleted (по умолчанию) или completed');

export type StatusFilter = z.infer<typeof StatusFilterSchema>;

/**
 * Internal task status values
 */
export const TaskStatusValues = {
  UNCOMPLETED: 0,
  COMPLETED: 2,
} as const;

export type TaskStatusValue = (typeof TaskStatusValues)[keyof typeof TaskStatusValues];
