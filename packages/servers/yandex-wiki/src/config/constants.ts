/**
 * Configuration constants for Yandex Wiki server
 */

/**
 * Дефолтные значения конфигурации
 */
export const DEFAULT_API_BASE = 'https://api.wiki.yandex.net' as const;
export const DEFAULT_LOG_LEVEL = 'info' as const;
export const DEFAULT_REQUEST_TIMEOUT = 30000 as const;
export const DEFAULT_LOGS_DIR = './logs' as const;
export const DEFAULT_LOG_MAX_SIZE = 51200 as const; // 50KB
export const DEFAULT_LOG_MAX_FILES = 20 as const;
export const DEFAULT_TOOL_DISCOVERY_MODE = 'eager' as const;
export const DEFAULT_ESSENTIAL_TOOLS = ['ping', 'search_tools'] as const;
export const DEFAULT_RETRY_ATTEMPTS = 3 as const;
export const DEFAULT_RETRY_MIN_DELAY = 1000 as const;
export const DEFAULT_RETRY_MAX_DELAY = 10000 as const;

/**
 * Названия переменных окружения
 */
export const ENV_VAR_NAMES = {
  YANDEX_WIKI_TOKEN: 'YANDEX_WIKI_TOKEN',
  YANDEX_ORG_ID: 'YANDEX_ORG_ID',
  YANDEX_CLOUD_ORG_ID: 'YANDEX_CLOUD_ORG_ID',
  LOG_LEVEL: 'LOG_LEVEL',
  REQUEST_TIMEOUT: 'REQUEST_TIMEOUT',
  LOGS_DIR: 'LOGS_DIR',
  PRETTY_LOGS: 'PRETTY_LOGS',
  LOG_MAX_SIZE: 'LOG_MAX_SIZE',
  LOG_MAX_FILES: 'LOG_MAX_FILES',
  TOOL_DISCOVERY_MODE: 'TOOL_DISCOVERY_MODE',
  ESSENTIAL_TOOLS: 'ESSENTIAL_TOOLS',
  RETRY_ATTEMPTS: 'YANDEX_WIKI_RETRY_ATTEMPTS',
  RETRY_MIN_DELAY: 'YANDEX_WIKI_RETRY_MIN_DELAY',
  RETRY_MAX_DELAY: 'YANDEX_WIKI_RETRY_MAX_DELAY',
} as const;
