/**
 * Shared schema for field filtering
 *
 * Used across multiple tools to allow users to specify which fields
 * to include in the response for context window economy.
 */

import { z } from 'zod';

/**
 * Default fields to return when not specified
 */
export const DEFAULT_TASK_FIELDS = [
  'id',
  'projectId',
  'title',
  'priority',
  'status',
  'dueDate',
] as const;

/**
 * Schema for field selection in task responses
 *
 * @example
 * fields: ['id', 'title', 'dueDate']
 * fields: [] // returns all fields
 */
export const FieldsSchema = z
  .array(z.string())
  .optional()
  .default([...DEFAULT_TASK_FIELDS])
  .describe(
    'Поля для возврата в ответе. Пустой массив = все поля. По умолчанию: id, projectId, title, priority, status, dueDate'
  );

export type Fields = z.infer<typeof FieldsSchema>;
