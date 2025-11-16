/**
 * Загрузка и валидация конфигурации из переменных окружения
 */

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ServerConfig, LogLevel } from './types.js';
import {
  DEFAULT_API_BASE,
  DEFAULT_LOG_LEVEL,
  DEFAULT_REQUEST_TIMEOUT,
  DEFAULT_MAX_BATCH_SIZE,
  DEFAULT_MAX_CONCURRENT_REQUESTS,
  DEFAULT_LOGS_DIR,
  DEFAULT_LOG_MAX_SIZE,
  DEFAULT_LOG_MAX_FILES,
  ENV_VAR_NAMES,
} from './constants.js';

// Путь к корню проекта (dist/ или src/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '../..');

/**
 * Валидация уровня логирования
 */
function validateLogLevel(level: string): LogLevel {
  const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  if (validLevels.includes(level as LogLevel)) {
    return level as LogLevel;
  }
  return DEFAULT_LOG_LEVEL;
}

/**
 * Валидация и парсинг таймаута
 */
function validateTimeout(timeout: string | undefined, defaultValue: number): number {
  if (!timeout) {
    return defaultValue;
  }

  const parsed = parseInt(timeout, 10);
  if (isNaN(parsed) || parsed < 5000 || parsed > 120000) {
    return defaultValue;
  }

  return parsed;
}

/**
 * Валидация и парсинг максимального размера batch-запроса
 */
function validateMaxBatchSize(value: string | undefined, defaultValue: number): number {
  if (!value) {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 1 || parsed > 1000) {
    return defaultValue;
  }

  return parsed;
}

/**
 * Валидация и парсинг максимального количества одновременных запросов
 */
function validateMaxConcurrentRequests(value: string | undefined, defaultValue: number): number {
  if (!value) {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 1 || parsed > 20) {
    return defaultValue;
  }

  return parsed;
}

/**
 * Валидация ID организации
 * @throws {Error} если ID не указаны или указаны оба одновременно
 */
function validateOrgIds(
  orgId: string | undefined,
  cloudOrgId: string | undefined
): { orgId?: string; cloudOrgId?: string } {
  const hasOrgId = orgId && orgId.trim() !== '';
  const hasCloudOrgId = cloudOrgId && cloudOrgId.trim() !== '';

  if (!hasOrgId && !hasCloudOrgId) {
    throw new Error(
      'Необходимо указать ID организации. ' +
        'Используйте YANDEX_ORG_ID (для Яндекс 360 для бизнеса) ' +
        'или YANDEX_CLOUD_ORG_ID (для Yandex Cloud Organization).'
    );
  }

  if (hasOrgId && hasCloudOrgId) {
    throw new Error(
      'Нельзя использовать YANDEX_ORG_ID и YANDEX_CLOUD_ORG_ID одновременно. ' +
        'Укажите только один из них.'
    );
  }

  return {
    ...(hasOrgId && { orgId: orgId.trim() }),
    ...(hasCloudOrgId && { cloudOrgId: cloudOrgId.trim() }),
  };
}

/**
 * Загрузка конфигурации из переменных окружения
 * @throws {Error} если обязательные переменные не установлены
 */
export function loadConfig(): ServerConfig {
  const token = process.env[ENV_VAR_NAMES.YANDEX_TRACKER_TOKEN];

  if (!token || token.trim() === '') {
    throw new Error(
      `${ENV_VAR_NAMES.YANDEX_TRACKER_TOKEN} не установлен. ` +
        'Получите OAuth токен в настройках Яндекс и добавьте в конфигурацию.'
    );
  }

  // Валидация ID организации (выбрасывает ошибку при проблемах)
  const validatedOrgIds = validateOrgIds(
    process.env[ENV_VAR_NAMES.YANDEX_ORG_ID],
    process.env[ENV_VAR_NAMES.YANDEX_CLOUD_ORG_ID]
  );

  // Используем || для дефолтных значений, так как пустая строка должна быть заменена

  const apiBase = process.env[ENV_VAR_NAMES.YANDEX_TRACKER_API_BASE]?.trim() || DEFAULT_API_BASE;

  const logLevel = validateLogLevel(
    process.env[ENV_VAR_NAMES.LOG_LEVEL]?.trim() || DEFAULT_LOG_LEVEL
  );
  const requestTimeout = validateTimeout(
    process.env[ENV_VAR_NAMES.REQUEST_TIMEOUT],
    DEFAULT_REQUEST_TIMEOUT
  );
  const maxBatchSize = validateMaxBatchSize(
    process.env[ENV_VAR_NAMES.MAX_BATCH_SIZE],
    DEFAULT_MAX_BATCH_SIZE
  );
  const maxConcurrentRequests = validateMaxConcurrentRequests(
    process.env[ENV_VAR_NAMES.MAX_CONCURRENT_REQUESTS],
    DEFAULT_MAX_CONCURRENT_REQUESTS
  );

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const logsDirRaw = process.env[ENV_VAR_NAMES.LOGS_DIR]?.trim() || DEFAULT_LOGS_DIR;
  // Если путь относительный - резолвим относительно PROJECT_ROOT
  const logsDir = resolve(PROJECT_ROOT, logsDirRaw);
  const prettyLogs = process.env[ENV_VAR_NAMES.PRETTY_LOGS] === 'true';

  // Ротация логов (по умолчанию: 50KB, 20 файлов = максимум ~1MB на диске)
  const logMaxSize = parseInt(
    process.env[ENV_VAR_NAMES.LOG_MAX_SIZE] || String(DEFAULT_LOG_MAX_SIZE),
    10
  );
  const logMaxFiles = parseInt(
    process.env[ENV_VAR_NAMES.LOG_MAX_FILES] || String(DEFAULT_LOG_MAX_FILES),
    10
  );

  return {
    token: token.trim(),
    ...validatedOrgIds,
    apiBase: apiBase.trim(),
    logLevel,
    requestTimeout,
    maxBatchSize,
    maxConcurrentRequests,
    logsDir,
    prettyLogs,
    logMaxSize,
    logMaxFiles,
  };
}
