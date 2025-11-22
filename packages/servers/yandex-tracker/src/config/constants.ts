/**
 * Configuration constants for Yandex Tracker server
 *
 * Moved from @mcp-framework/infrastructure to maintain clean separation:
 * Infrastructure layer should not contain domain-specific code
 */

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
export const DEFAULT_TOOL_DISCOVERY_MODE = 'eager' as const;
export const DEFAULT_ESSENTIAL_TOOLS = ['ping', 'search_tools'] as const;
export const DEFAULT_RETRY_ATTEMPTS = 3 as const;
export const DEFAULT_RETRY_MIN_DELAY = 1000 as const; // 1 секунда
export const DEFAULT_RETRY_MAX_DELAY = 10000 as const; // 10 секунд

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
  TOOL_DISCOVERY_MODE: 'TOOL_DISCOVERY_MODE',
  ESSENTIAL_TOOLS: 'ESSENTIAL_TOOLS',
  ENABLED_TOOL_CATEGORIES: 'ENABLED_TOOL_CATEGORIES',
  DISABLED_TOOL_GROUPS: 'DISABLED_TOOL_GROUPS',
  RETRY_ATTEMPTS: 'YANDEX_TRACKER_RETRY_ATTEMPTS',
  RETRY_MIN_DELAY: 'YANDEX_TRACKER_RETRY_MIN_DELAY',
  RETRY_MAX_DELAY: 'YANDEX_TRACKER_RETRY_MAX_DELAY',
} as const;
