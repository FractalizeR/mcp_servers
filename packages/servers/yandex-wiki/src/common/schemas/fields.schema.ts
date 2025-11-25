import { z } from 'zod';

/**
 * Schema для дополнительных полей ответа
 */
export const WikiFieldsSchema = z
  .string()
  .optional()
  .describe('Дополнительные поля через запятую: attributes, breadcrumbs, content, redirect');
