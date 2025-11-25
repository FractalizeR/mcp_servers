import { z } from 'zod';

/**
 * Schema для ID страницы (integer)
 */
export const PageIdSchema = z.number().int().positive().describe('ID страницы Wiki (целое число)');

/**
 * Schema для slug страницы (path)
 */
export const PageSlugSchema = z
  .string()
  .min(1)
  .describe('Slug страницы Wiki (например, users/docs/readme)');
