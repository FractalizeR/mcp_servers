/**
 * Zod schema for validating fields parameter (response field filtering)
 *
 * Domain-specific version for TickTick with field descriptions
 *
 * IMPORTANT: This parameter is REQUIRED for all tools returning API objects.
 * This is critical for MCP context economy.
 */

import { z } from 'zod';

/**
 * Validation for REQUIRED array of fields for response filtering
 *
 * Examples of TickTick task fields:
 * - id, title, content, status, priority
 * - dueDate, startDate, createdTime, modifiedTime
 * - projectId, tags, items (subtasks)
 *
 * @example
 * // Correct
 * fields: ['id', 'title', 'priority', 'dueDate']
 *
 * // ERROR - empty array
 * fields: []
 *
 * // ERROR - field not specified
 * // fields is missing
 */
export const FieldsSchema = z
  .array(z.string().min(1, 'Field name cannot be empty'))
  .min(1, 'Parameter fields is required and must contain at least 1 field')
  .describe(
    'List of fields to return (REQUIRED). ' +
      'Specify at least one field for MCP context economy. ' +
      'Supports dot-notation for nested fields.'
  );

/**
 * Type inference from schema
 */
export type Fields = z.infer<typeof FieldsSchema>;

/**
 * Optional fields schema for tools where fields filtering is optional
 */
export const OptionalFieldsSchema = z
  .array(z.string().min(1, 'Field name cannot be empty'))
  .optional()
  .describe('Optional list of fields to return. If not specified, returns all fields.');

export type OptionalFields = z.infer<typeof OptionalFieldsSchema>;
