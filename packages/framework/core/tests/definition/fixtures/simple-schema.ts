/**
 * Fixtures: Простые Zod схемы для тестирования генератора definition
 */

import { z } from 'zod';

/**
 * Простейшая схема - 1 обязательное поле
 */
export const MinimalSchema = z.object({
  id: z.string(),
});

/**
 * Схема с обязательными и опциональными полями
 */
export const BasicSchema = z.object({
  issueKey: z.string().min(1).describe('Ключ задачи в формате QUEUE-123'),
  fields: z.array(z.string()).optional().describe('Поля для возврата'),
});

/**
 * Схема с различными примитивными типами
 */
export const PrimitiveTypesSchema = z.object({
  stringField: z.string(),
  numberField: z.number(),
  booleanField: z.boolean(),
  optionalString: z.string().optional(),
  optionalNumber: z.number().optional(),
});

/**
 * Схема с enum
 */
export const EnumSchema = z.object({
  priority: z.enum(['low', 'medium', 'high']).describe('Приоритет задачи'),
  status: z.enum(['open', 'in-progress', 'closed']),
});

/**
 * Схема с валидацией (min, max, minLength, maxLength)
 */
export const ValidationSchema = z.object({
  username: z.string().min(3).max(20),
  age: z.number().min(0).max(120),
  tags: z.array(z.string()).min(1).max(10),
});

/**
 * Схема с default значениями
 */
export const DefaultValuesSchema = z.object({
  perPage: z.number().default(50).describe('Количество элементов на странице'),
  includeArchived: z.boolean().default(false),
});

/**
 * Схема с nullable полями
 */
export const NullableSchema = z.object({
  assignee: z.string().nullable(),
  dueDate: z.string().optional().nullable(),
});
