/**
 * Префикс для всех MCP tools Yandex Wiki
 * @example "yw_get_page"
 */
export const MCP_TOOL_PREFIX = 'yw_' as const;

/**
 * Base URL API Yandex Wiki (hardcoded)
 */
export const YANDEX_WIKI_API_BASE = 'https://api.wiki.yandex.net';

/**
 * Базовое имя проекта для CLI
 */
export const PROJECT_BASE_NAME = 'yandex-wiki';

/**
 * Технический идентификатор MCP сервера (используется в конфигурации клиентов)
 */
export const MCP_SERVER_NAME = PROJECT_BASE_NAME;

/**
 * Отображаемое имя MCP сервера (показывается в UI клиентов)
 */
export const MCP_SERVER_DISPLAY_NAME = "FractalizeR's Yandex Wiki MCP" as const;

/**
 * Точка входа сервера (относительный путь от package.json)
 */
export const SERVER_ENTRY_POINT = 'dist/yandex-wiki.bundle.cjs';

/**
 * Уровень логирования по умолчанию
 */
export const DEFAULT_LOG_LEVEL = 'info';

/**
 * Essential tools для Yandex Wiki MCP сервера
 * - yw_ping: проверка работоспособности сервера (с префиксом)
 * - search_tools: поиск инструментов из @fractalizer/mcp-search (БЕЗ префикса — это framework tool)
 *
 * Имена формируются через buildToolName(name, MCP_TOOL_PREFIX) с автонормализацией:
 * buildToolName('ping', 'yw') => 'yw_ping'
 */
export const YANDEX_WIKI_ESSENTIAL_TOOLS = ['yw_ping', 'search_tools'] as const;
