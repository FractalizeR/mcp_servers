/**
 * Константы для тестов
 *
 * Переиспользует значения из src/constants.ts для обеспечения
 * консистентности между продакшн кодом и тестами
 */

import { MCP_TOOL_PREFIX } from '../src/constants.js';

/**
 * Префикс для названий инструментов в тестах
 * @example "fractalizer_mcp_yandex_tracker_"
 */
export const TEST_TOOL_PREFIX = MCP_TOOL_PREFIX;

/**
 * Короткий префикс (без underscore) для тестов поиска
 * @example "fyt_mcp" или "fyt"
 */
export const TEST_TOOL_PREFIX_SHORT = MCP_TOOL_PREFIX.slice(0, -1); // "fyt_mcp"
export const TEST_TOOL_BRAND = 'fyt'; // Первая часть префикса
export const TEST_TOOL_CATEGORY = 'mcp'; // Вторая часть префикса

/**
 * Полные имена инструментов для тестов
 */
export const TEST_TOOL_NAMES = {
  PING: `${TEST_TOOL_PREFIX}ping`,
  GET_ISSUES: `${TEST_TOOL_PREFIX}get_issues`,
  FIND_ISSUES: `${TEST_TOOL_PREFIX}find_issues`,
  ISSUE_GET_URL: `${TEST_TOOL_PREFIX}issue_get_url`,
  SEARCH_TOOLS: `${TEST_TOOL_PREFIX}search_tools`,
  DEMO: 'demo', // Специальный инструмент без префикса
} as const;
