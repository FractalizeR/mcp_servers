/**
 * Утилита для построения имен MCP tools
 */

/**
 * Разделитель между префиксом и именем tool
 */
const TOOL_NAME_SEPARATOR = '_';

/**
 * Построить полное имя tool с префиксом
 *
 * Автоматически нормализует префикс: добавляет разделитель '_' если prefix
 * не пустой и не заканчивается на '_'. Это обеспечивает единообразие имён
 * инструментов во всех MCP серверах.
 *
 * @param name - Имя tool без префикса (например, 'ping', 'get_issues', 'search_tools')
 * @param prefix - Префикс для tool (опционально, по умолчанию '')
 * @returns Полное имя tool с нормализованным префиксом
 *
 * @example
 * buildToolName('ping') // => 'ping'
 * buildToolName('ping', 'my_app_') // => 'my_app_ping'
 * buildToolName('ping', 'my_app') // => 'my_app_ping' (автонормализация)
 * buildToolName('get_issues', 'yw') // => 'yw_get_issues'
 */
export function buildToolName(name: string, prefix = ''): string {
  if (!prefix) return name;

  // Нормализация: добавить разделитель если prefix не заканчивается на него
  const normalizedPrefix = prefix.endsWith(TOOL_NAME_SEPARATOR)
    ? prefix
    : `${prefix}${TOOL_NAME_SEPARATOR}`;

  return `${normalizedPrefix}${name}`;
}
