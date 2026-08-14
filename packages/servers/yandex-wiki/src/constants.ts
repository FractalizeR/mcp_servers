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
 * Уровень логирования по умолчанию
 */
export const DEFAULT_LOG_LEVEL = 'info';
