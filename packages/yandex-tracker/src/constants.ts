/**
 * Глобальные константы проекта
 */

/**
 * Базовое название проекта (без префиксов)
 * Используется для построения других названий
 * @example "fractalizer_mcp_yandex_tracker"
 */
const PROJECT_BASE_NAME = 'fractalizer_mcp_yandex_tracker' as const;

/**
 * Название MCP сервера (используется в конфигурациях клиентов)
 * @example "fractalizer_mcp_yandex_tracker" в mcpServers config
 */
export const MCP_SERVER_NAME = PROJECT_BASE_NAME;

/**
 * Префикс для названий MCP инструментов
 * @example "fractalizer_mcp_yandex_tracker_get_issues"
 */
export const MCP_TOOL_PREFIX = `${PROJECT_BASE_NAME}_` as const;

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
 * Дефолтные значения конфигурации
 */
export const DEFAULT_API_BASE = 'https://api.tracker.yandex.net' as const;
export const DEFAULT_LOG_LEVEL = 'info' as const;
export const DEFAULT_REQUEST_TIMEOUT = 30000 as const;
export const DEFAULT_MAX_BATCH_SIZE = 200 as const;
export const DEFAULT_MAX_CONCURRENT_REQUESTS = 5 as const;
export const DEFAULT_LOGS_DIR = './logs' as const;
export const DEFAULT_LOG_MAX_SIZE = 51200 as const; // 50KB в байтах
export const DEFAULT_LOG_MAX_FILES = 20 as const;

/**
 * Путь к entry point MCP сервера (относительно корня проекта)
 */
export const SERVER_ENTRY_POINT = 'dist/index.js' as const;

/**
 * Названия переменных окружения
 */
export const ENV_VAR_NAMES = {
  YANDEX_TRACKER_TOKEN: 'YANDEX_TRACKER_TOKEN',
  YANDEX_ORG_ID: 'YANDEX_ORG_ID',
  YANDEX_CLOUD_ORG_ID: 'YANDEX_CLOUD_ORG_ID',
  YANDEX_TRACKER_API_BASE: 'YANDEX_TRACKER_API_BASE',
  LOG_LEVEL: 'LOG_LEVEL',
  REQUEST_TIMEOUT: 'REQUEST_TIMEOUT',
  MAX_BATCH_SIZE: 'MAX_BATCH_SIZE',
  MAX_CONCURRENT_REQUESTS: 'MAX_CONCURRENT_REQUESTS',
  LOGS_DIR: 'LOGS_DIR',
  PRETTY_LOGS: 'PRETTY_LOGS',
  LOG_MAX_SIZE: 'LOG_MAX_SIZE',
  LOG_MAX_FILES: 'LOG_MAX_FILES',
} as const;
