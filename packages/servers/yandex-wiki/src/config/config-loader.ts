/**
 * Configuration loader for Yandex Wiki server
 */

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ServerConfig, LogLevel, ParsedCategoryFilter } from './server-config.interface.js';
import {
  DEFAULT_API_BASE,
  DEFAULT_LOG_LEVEL,
  DEFAULT_REQUEST_TIMEOUT,
  DEFAULT_MAX_BATCH_SIZE,
  DEFAULT_MAX_CONCURRENT_REQUESTS,
  DEFAULT_LOGS_DIR,
  DEFAULT_LOG_MAX_SIZE,
  DEFAULT_LOG_MAX_FILES,
  DEFAULT_TOOL_DISCOVERY_MODE,
  DEFAULT_ESSENTIAL_TOOLS,
  DEFAULT_RETRY_ATTEMPTS,
  DEFAULT_RETRY_MIN_DELAY,
  DEFAULT_RETRY_MAX_DELAY,
  ENV_VAR_NAMES,
} from './constants.js';

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
 * Валидация режима tool discovery
 */
function validateToolDiscoveryMode(mode: string | undefined): 'lazy' | 'eager' {
  if (mode === 'eager' || mode === 'lazy') {
    return mode;
  }
  return DEFAULT_TOOL_DISCOVERY_MODE;
}

/**
 * Парсинг списка essential tools из переменной окружения
 */
function parseEssentialTools(value: string | undefined): readonly string[] {
  if (!value || value.trim() === '') {
    return DEFAULT_ESSENTIAL_TOOLS;
  }
  return value
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

/**
 * Парсинг списка отключенных групп инструментов
 *
 * Формат: "category" или "category:subcategory" через запятую
 * Примеры:
 * - "grids,pages" - отключить целые категории
 * - "pages:write,grids:update" - отключить подкатегории
 * - "grids,pages:write,helpers:demo" - смешанный формат
 *
 * @param value - значение переменной окружения DISABLED_TOOL_GROUPS
 * @returns Распарсенная структура отключенных групп
 */
function parseDisabledToolGroups(value: string | undefined): ParsedCategoryFilter | undefined {
  // Если не указано или пустая строка - ничего не отключаем
  if (!value || value.trim() === '') {
    return undefined;
  }

  const disabledCategories = new Set<string>();
  const disabledCategoriesWithSubcategories = new Map<string, Set<string>>();

  const parts = value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const part of parts) {
    if (part.includes(':')) {
      // Формат: "category:subcategory"
      const segments = part.split(':');

      if (segments.length !== 2) {
        continue; // Пропускаем невалидный формат
      }

      const [cat, subcat] = segments.map((s) => s.trim().toLowerCase());

      if (!cat || !subcat) {
        continue; // Пропускаем пустые сегменты
      }

      let subcategories = disabledCategoriesWithSubcategories.get(cat);
      if (!subcategories) {
        subcategories = new Set();
        disabledCategoriesWithSubcategories.set(cat, subcategories);
      }
      subcategories.add(subcat);
    } else {
      // Формат: "category" (отключить всю категорию)
      disabledCategories.add(part.toLowerCase());
    }
  }

  // Если ничего не распарсилось, возвращаем undefined
  if (disabledCategories.size === 0 && disabledCategoriesWithSubcategories.size === 0) {
    return undefined;
  }

  return {
    categories: disabledCategories,
    categoriesWithSubcategories: disabledCategoriesWithSubcategories,
    includeAll: false, // Это список отключенных, а не включенных
  };
}

/**
 * Валидация retry attempts
 */
function validateRetryAttempts(value: string | undefined, defaultValue: number): number {
  if (!value) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 0 || parsed > 10) {
    return defaultValue;
  }
  return parsed;
}

/**
 * Валидация retry delay
 */
function validateRetryDelay(
  value: string | undefined,
  defaultValue: number,
  min: number,
  max: number
): number {
  if (!value) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < min || parsed > max) {
    return defaultValue;
  }
  return parsed;
}

/**
 * Валидация batch size
 */
function validateBatchSize(value: string | undefined, defaultValue: number): number {
  if (!value) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 1 || parsed > 100) {
    return defaultValue;
  }
  return parsed;
}

/**
 * Валидация concurrent requests
 */
function validateConcurrentRequests(value: string | undefined, defaultValue: number): number {
  if (!value) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 1 || parsed > 50) {
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
  const token = process.env[ENV_VAR_NAMES.YANDEX_WIKI_TOKEN];

  if (!token || token.trim() === '') {
    throw new Error(
      `${ENV_VAR_NAMES.YANDEX_WIKI_TOKEN} не установлен. ` +
        'Получите OAuth токен в настройках Яндекс и добавьте в конфигурацию.'
    );
  }

  const validatedOrgIds = validateOrgIds(
    process.env[ENV_VAR_NAMES.YANDEX_ORG_ID],
    process.env[ENV_VAR_NAMES.YANDEX_CLOUD_ORG_ID]
  );

  const logLevel = validateLogLevel(
    process.env[ENV_VAR_NAMES.LOG_LEVEL]?.trim() || DEFAULT_LOG_LEVEL
  );
  const requestTimeout = validateTimeout(
    process.env[ENV_VAR_NAMES.REQUEST_TIMEOUT],
    DEFAULT_REQUEST_TIMEOUT
  );

  const maxBatchSize = validateBatchSize(
    process.env[ENV_VAR_NAMES.MAX_BATCH_SIZE],
    DEFAULT_MAX_BATCH_SIZE
  );

  const maxConcurrentRequests = validateConcurrentRequests(
    process.env[ENV_VAR_NAMES.MAX_CONCURRENT_REQUESTS],
    DEFAULT_MAX_CONCURRENT_REQUESTS
  );

  const logsDirRaw = process.env[ENV_VAR_NAMES.LOGS_DIR]?.trim() || DEFAULT_LOGS_DIR;
  const logsDir = resolve(PROJECT_ROOT, logsDirRaw);
  const prettyLogs = process.env[ENV_VAR_NAMES.PRETTY_LOGS] === 'true';

  const logMaxSize = parseInt(
    process.env[ENV_VAR_NAMES.LOG_MAX_SIZE] || String(DEFAULT_LOG_MAX_SIZE),
    10
  );
  const logMaxFiles = parseInt(
    process.env[ENV_VAR_NAMES.LOG_MAX_FILES] || String(DEFAULT_LOG_MAX_FILES),
    10
  );

  const toolDiscoveryMode = validateToolDiscoveryMode(
    process.env[ENV_VAR_NAMES.TOOL_DISCOVERY_MODE]
  );
  const essentialTools = parseEssentialTools(process.env[ENV_VAR_NAMES.ESSENTIAL_TOOLS]);

  // Парсинг отключенных групп инструментов (негативный фильтр)
  const disabledToolGroupsRaw = process.env[ENV_VAR_NAMES.DISABLED_TOOL_GROUPS];
  const disabledToolGroups = parseDisabledToolGroups(disabledToolGroupsRaw);

  const retryAttempts = validateRetryAttempts(
    process.env[ENV_VAR_NAMES.RETRY_ATTEMPTS],
    DEFAULT_RETRY_ATTEMPTS
  );

  const retryMinDelay = validateRetryDelay(
    process.env[ENV_VAR_NAMES.RETRY_MIN_DELAY],
    DEFAULT_RETRY_MIN_DELAY,
    100,
    5000
  );

  const retryMaxDelay = validateRetryDelay(
    process.env[ENV_VAR_NAMES.RETRY_MAX_DELAY],
    DEFAULT_RETRY_MAX_DELAY,
    1000,
    60000
  );

  return {
    token: token.trim(),
    ...validatedOrgIds,
    apiBase: DEFAULT_API_BASE,
    logLevel,
    requestTimeout,
    maxBatchSize,
    maxConcurrentRequests,
    logsDir,
    prettyLogs,
    logMaxSize,
    logMaxFiles,
    toolDiscoveryMode,
    essentialTools,
    retryAttempts,
    retryMinDelay,
    retryMaxDelay,
    // Условно добавляем disabledToolGroups только если оно определено
    ...(disabledToolGroups && { disabledToolGroups }),
  };
}
