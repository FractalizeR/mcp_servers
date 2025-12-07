/**
 * Zod schema for validating response fields parameter (output field filtering)
 *
 * Domain-specific version for Yandex Wiki with field descriptions
 *
 * IMPORTANT: This parameter is REQUIRED for all tools returning API objects.
 * This is critical for MCP context economy.
 */

import { z } from 'zod';

/**
 * Validation for REQUIRED array of fields for response filtering
 *
 * Examples of Yandex Wiki page fields:
 * - id, title, slug, body
 * - createdAt, updatedAt, author
 * - access_level, type, status
 *
 * @example
 * // Correct
 * fields: ['id', 'title', 'slug', 'body']
 *
 * // ERROR - empty array
 * fields: []
 *
 * // ERROR - field not specified
 * // fields is missing
 */
export const ResponseFieldsSchema = z
  .array(z.string().min(1, 'Field name cannot be empty'))
  .min(1, 'Parameter fields is required and must contain at least 1 field')
  .describe(
    'List of response fields to return (REQUIRED). ' +
      'Specify at least one field for MCP context economy. ' +
      'Supports dot-notation for nested fields.'
  );

/**
 * Type inference from schema
 */
export type ResponseFields = z.infer<typeof ResponseFieldsSchema>;

/**
 * Optional fields schema for tools where fields filtering is optional
 */
export const OptionalResponseFieldsSchema = z
  .array(z.string().min(1, 'Field name cannot be empty'))
  .optional()
  .default([])
  .describe('Optional list of response fields to return. If not specified, returns all fields.');

export type OptionalResponseFields = z.infer<typeof OptionalResponseFieldsSchema>;
