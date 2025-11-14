/**
 * Zod схема валидации параметров для SearchToolsTool
 *
 * Responsibilities:
 * - Валидация query (непустая строка)
 * - Валидация detailLevel (enum)
 * - Валидация category (ToolCategory или undefined)
 * - Валидация isHelper (boolean или undefined)
 * - Валидация limit (положительное число или undefined)
 */

import { z } from 'zod';
import { ToolCategory } from '@mcp/tools/base/tool-metadata.js';

/**
 * Схема для детализации результатов
 */
const DetailLevelSchema = z.enum(['name_only', 'name_and_description', 'full']).optional();

/**
 * Схема для категории tool
 */
const ToolCategorySchema = z.nativeEnum(ToolCategory).optional();

/**
 * Схема параметров для поиска tools
 */
export const SearchToolsParamsSchema = z.object({
  /**
   * Поисковый запрос (обязательный, непустая строка)
   */
  query: z
    .string()
    .trim()
    .min(1, 'Query must be a non-empty string')
    .describe('Search query for finding tools'),

  /**
   * Уровень детализации результатов
   */
  detailLevel: DetailLevelSchema.describe(
    'Level of detail in results: name_only, name_and_description, or full'
  ),

  /**
   * Фильтр по категории
   */
  category: ToolCategorySchema.describe('Filter tools by category'),

  /**
   * Фильтр по типу (helper/api)
   */
  isHelper: z
    .boolean()
    .optional()
    .describe('Filter by tool type: true for helpers, false for API tools'),

  /**
   * Лимит результатов
   */
  limit: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Maximum number of results to return (default: 10)'),
});

/**
 * Тип параметров (type inference)
 */
export type SearchToolsParams = z.infer<typeof SearchToolsParamsSchema>;
