/**
 * Утилита для построения имен MCP tools
 */

/**
 * Построить полное имя tool с префиксом
 *
 * @param name - Имя tool без префикса (например, 'ping', 'get_issues', 'search_tools')
 * @param prefix - Префикс для tool (опционально, по умолчанию '')
 * @returns Полное имя tool с префиксом (например, 'my_app_ping')
 *
 * @example
 * buildToolName('ping') // => 'ping'
 * buildToolName('ping', 'my_app_') // => 'my_app_ping'
 * buildToolName('get_issues', 'tracker_') // => 'tracker_get_issues'
 */
export function buildToolName(name: string, prefix = ''): string {
  return `${prefix}${name}`;
}
