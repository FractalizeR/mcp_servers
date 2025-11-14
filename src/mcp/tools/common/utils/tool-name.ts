/**
 * Утилита для построения имен MCP tools
 */

import { MCP_TOOL_PREFIX } from '../../../../constants.js';

/**
 * Построить полное имя tool с префиксом
 *
 * @param name - Имя tool без префикса (например, 'ping', 'get_issues', 'search_tools')
 * @returns Полное имя tool с префиксом (например, 'fyt_mcp_ping')
 *
 * @example
 * buildToolName('ping') // => 'fyt_mcp_ping'
 * buildToolName('get_issues') // => 'fyt_mcp_get_issues'
 * buildToolName('search_tools') // => 'fyt_mcp_search_tools'
 */
export function buildToolName(name: string): string {
  return `${MCP_TOOL_PREFIX}${name}`;
}
