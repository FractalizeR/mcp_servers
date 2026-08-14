/**
 * Глобальные константы проекта
 */

/**
 * Базовое название проекта (без префиксов)
 * Используется для построения других названий
 * @example "fractalizer_mcp_yandex_tracker"
 */
export const PROJECT_BASE_NAME = 'fractalizer_mcp_yandex_tracker' as const;

/**
 * Название MCP сервера (используется в конфигурациях клиентов)
 * @example "fractalizer_mcp_yandex_tracker" в mcpServers config
 */
export const MCP_SERVER_NAME = PROJECT_BASE_NAME;

/**
 * Префикс для названий MCP инструментов
 * @example "fr_yandex_tracker_get_issues"
 */
export const MCP_TOOL_PREFIX = 'fr_yandex_tracker_' as const;

/**
 * Отображаемое название MCP сервера
 */
export const MCP_SERVER_DISPLAY_NAME = "FractalizeR's Yandex Tracker MCP" as const;

/**
 * Описание MCP сервера
 */
export const MCP_SERVER_DESCRIPTION = 'MCP server for Yandex Tracker API v3 integration' as const;

/**
 * Автор проекта
 */
export const PROJECT_AUTHOR = 'FractalizeR' as const;

/**
 * Email автора
 */
export const PROJECT_AUTHOR_EMAIL = 'fractalizer@example.com' as const;

/**
 * Домашняя страница проекта
 */
export const PROJECT_HOMEPAGE = 'https://github.com/FractalizeR/mcp_server_yandex_tracker' as const;

/**
 * Репозиторий проекта
 */
export const PROJECT_REPOSITORY_URL =
  'https://github.com/FractalizeR/mcp_server_yandex_tracker' as const;

/**
 * Configuration constants re-exported from config module
 * @deprecated Import directly from '#config' instead
 */
export {
  DEFAULT_API_BASE,
  DEFAULT_LOG_LEVEL,
  DEFAULT_REQUEST_TIMEOUT,
  DEFAULT_MAX_BATCH_SIZE,
  DEFAULT_MAX_CONCURRENT_REQUESTS,
  DEFAULT_LOGS_DIR,
  DEFAULT_LOG_MAX_SIZE,
  DEFAULT_LOG_MAX_FILES,
  ENV_VAR_NAMES,
} from '#config';
