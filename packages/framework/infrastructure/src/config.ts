/**
 * Загрузка и валидация конфигурации из переменных окружения
 */

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ServerConfig, LogLevel, ParsedCategoryFilter } from './types.js';
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
 * Парсинг фильтра категорий инструментов из переменной окружения
 *
 * Формат: "issues,comments" или "issues:read,comments:write"
 *
 * Graceful degradation:
 * - Пустая строка или undefined → includeAll = true
 * - Невалидные категории → пропускаем (логирование будет на уровне выше)
 * - Невалидный формат элемента → пропускаем элемент
 *
 * @param value - значение переменной окружения ENABLED_TOOL_CATEGORIES
 * @returns Распарсенная структура фильтра
 */
function parseEnabledToolCategories(value: string | undefined): ParsedCategoryFilter {
  // Default: все категории
  if (!value || value.trim() === '') {
    return {
      categories: new Set(),
      categoriesWithSubcategories: new Map(),
      includeAll: true,
    };
  }

  const categories = new Set<string>();
  const categoriesWithSubcategories = new Map<string, Set<string>>();

  const parts = value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const part of parts) {
    if (part.includes(':')) {
      // Формат: "category:subcategory"
      const segments = part.split(':');

      // Валидация: должно быть ровно 2 сегмента
      if (segments.length !== 2) {
        // Пропускаем невалидный формат (например, "issues::read" или "issues:read:write")
        continue;
      }

      const [cat, subcat] = segments.map((s) => s.trim());

      // Пропускаем пустые сегменты
      if (!cat || !subcat) {
        continue;
      }

      let subcategories = categoriesWithSubcategories.get(cat);
      if (!subcategories) {
        subcategories = new Set();
        categoriesWithSubcategories.set(cat, subcategories);
      }
      subcategories.add(subcat);
    } else {
      // Формат: "category" (все подкатегории)
      categories.add(part);
    }
  }

  // Если ничего не распарсилось, возвращаем includeAll=true
  const includeAll = categories.size === 0 && categoriesWithSubcategories.size === 0;

  return {
    categories,
    categoriesWithSubcategories,
    includeAll,
  };
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

  // Tool Discovery Mode (lazy по умолчанию для масштабируемости)
  const toolDiscoveryMode = validateToolDiscoveryMode(
    process.env[ENV_VAR_NAMES.TOOL_DISCOVERY_MODE]
  );
  const essentialTools = parseEssentialTools(process.env[ENV_VAR_NAMES.ESSENTIAL_TOOLS]);

  // Парсинг фильтра категорий (опционально, только для eager режима)
  const enabledToolCategoriesRaw = process.env[ENV_VAR_NAMES.ENABLED_TOOL_CATEGORIES];
  const enabledToolCategories =
    enabledToolCategoriesRaw !== undefined
      ? parseEnabledToolCategories(enabledToolCategoriesRaw)
      : undefined;

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
    toolDiscoveryMode,
    essentialTools,
    // Условно добавляем enabledToolCategories только если оно определено
    ...(enabledToolCategories && { enabledToolCategories }),
  };
}
