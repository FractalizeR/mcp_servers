/**
 * Утилита для построения имен MCP tools
 */

import { MCP_TOOL_PREFIX } from '../../../../constants.js';

/**
 * Построить полное имя tool с префиксом
 *
 * @param name - Имя tool без префикса (например, 'ping', 'get_issues', 'search_tools')
 * @returns Полное имя tool с префиксом (например, 'fractalizer_mcp_yandex_tracker_ping')
 *
 * @example
 * buildToolName('ping') // => 'fractalizer_mcp_yandex_tracker_ping'
 * buildToolName('get_issues') // => 'fractalizer_mcp_yandex_tracker_get_issues'
 * buildToolName('search_tools') // => 'fractalizer_mcp_yandex_tracker_search_tools'
 */
export function buildToolName(name: string): string {
  return `${MCP_TOOL_PREFIX}${name}`;
}
