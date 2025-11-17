/**
 * Константы для infrastructure layer
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
