/**
 * Configuration loader and validators
 *
 * Moved from @fractalizer/mcp-infrastructure to maintain clean separation:
 * Infrastructure layer should not contain domain-specific code (Yandex Tracker)
 */

import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
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
  DEFAULT_RETRY_ATTEMPTS,
  DEFAULT_RETRY_MIN_DELAY,
  DEFAULT_RETRY_MAX_DELAY,
  ENV_VAR_NAMES,
  SERVER_NAME,
} from './constants.js';

/**
 * Переменные окружения, оставшиеся от удалённого lazy discovery (этап 2.1.A
 * плана модернизации). Молча игнорировать их хуже, чем не поддерживать вовсе:
 * у пользователей они уже прописаны в конфигах MCP клиентов и выглядят
 * работающими. Печатаем явное предупреждение в stderr и продолжаем запуск.
 */
const DEPRECATED_TOOL_DISCOVERY_ENV_VARS = ['TOOL_DISCOVERY_MODE', 'ESSENTIAL_TOOLS'] as const;

/**
 * Предупредить в stderr, если обнаружены устаревшие переменные окружения
 * lazy discovery. Не влияет на итоговый ServerConfig — значения не читаются.
 */
function warnDeprecatedToolDiscoveryEnvVars(): void {
  for (const name of DEPRECATED_TOOL_DISCOVERY_ENV_VARS) {
    if (process.env[name] !== undefined) {
      console.error(
        `[WARN] Переменная окружения ${name} больше не поддерживается и игнорируется. ` +
          'Lazy discovery убран: tools/list всегда возвращает полный список инструментов, ' +
          'прошедший фильтр DISABLED_TOOL_GROUPS. Удалите переменную из конфигурации MCP клиента.'
      );
    }
  }
}

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
 * Парсинг списка отключенных групп инструментов
 *
 * Формат: "category" или "category:subcategory" через запятую
 * Примеры:
 * - "components,checklists" - отключить целые категории
 * - "issues:worklog,issues:attachments" - отключить подкатегории
 * - "components,issues:worklog,helpers:demo" - смешанный формат
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
 * Build API configuration
 */
function buildApiConfig(): Pick<
  ServerConfig,
  'apiBase' | 'requestTimeout' | 'maxBatchSize' | 'maxConcurrentRequests'
> {
  return {
    apiBase: (
      process.env[ENV_VAR_NAMES.YANDEX_TRACKER_API_BASE]?.trim() || DEFAULT_API_BASE
    ).trim(),
    requestTimeout: validateTimeout(
      process.env[ENV_VAR_NAMES.REQUEST_TIMEOUT],
      DEFAULT_REQUEST_TIMEOUT
    ),
    maxBatchSize: validateMaxBatchSize(
      process.env[ENV_VAR_NAMES.MAX_BATCH_SIZE],
      DEFAULT_MAX_BATCH_SIZE
    ),
    maxConcurrentRequests: validateMaxConcurrentRequests(
      process.env[ENV_VAR_NAMES.MAX_CONCURRENT_REQUESTS],
      DEFAULT_MAX_CONCURRENT_REQUESTS
    ),
  };
}

/**
 * Resolve logs directory path from env or default
 */
export function resolveLogsDir(
  logsDirEnv: string | undefined,
  projectRoot: string,
  serverName: string,
  logsSubdir: string
): string {
  const trimmed = logsDirEnv?.trim() || undefined;
  const expanded = trimmed?.startsWith('~/') ? join(homedir(), trimmed.slice(2)) : trimmed;
  const cacheBase = process.env['XDG_CACHE_HOME'] || join(homedir(), '.cache');
  return expanded ? resolve(projectRoot, expanded) : join(cacheBase, serverName, logsSubdir);
}

/**
 * Build logging configuration
 */
function buildLoggingConfig(): Pick<
  ServerConfig,
  'logLevel' | 'logsDir' | 'prettyLogs' | 'logMaxSize' | 'logMaxFiles'
> {
  const logsDir = resolveLogsDir(
    process.env[ENV_VAR_NAMES.LOGS_DIR],
    PROJECT_ROOT,
    SERVER_NAME,
    DEFAULT_LOGS_DIR
  );

  return {
    logLevel: validateLogLevel(process.env[ENV_VAR_NAMES.LOG_LEVEL]?.trim() || DEFAULT_LOG_LEVEL),
    logsDir,
    prettyLogs: process.env[ENV_VAR_NAMES.PRETTY_LOGS] === 'true',
    logMaxSize: parseInt(
      process.env[ENV_VAR_NAMES.LOG_MAX_SIZE] || String(DEFAULT_LOG_MAX_SIZE),
      10
    ),
    logMaxFiles: parseInt(
      process.env[ENV_VAR_NAMES.LOG_MAX_FILES] || String(DEFAULT_LOG_MAX_FILES),
      10
    ),
  };
}

/**
 * Build tools configuration
 */
function buildToolsConfig(): Pick<ServerConfig, 'disabledToolGroups'> {
  const disabledToolGroupsRaw = process.env[ENV_VAR_NAMES.DISABLED_TOOL_GROUPS];

  const config: Pick<ServerConfig, 'disabledToolGroups'> = {};

  const disabledToolGroups = parseDisabledToolGroups(disabledToolGroupsRaw);
  if (disabledToolGroups) {
    config.disabledToolGroups = disabledToolGroups;
  }

  return config;
}

/**
 * Build retry configuration
 */
function buildRetryConfig(): Pick<
  ServerConfig,
  'retryAttempts' | 'retryMinDelay' | 'retryMaxDelay'
> {
  return {
    retryAttempts: validateRetryAttempts(
      process.env[ENV_VAR_NAMES.RETRY_ATTEMPTS],
      DEFAULT_RETRY_ATTEMPTS
    ),
    retryMinDelay: validateRetryDelay(
      process.env[ENV_VAR_NAMES.RETRY_MIN_DELAY],
      DEFAULT_RETRY_MIN_DELAY,
      100,
      5000
    ),
    retryMaxDelay: validateRetryDelay(
      process.env[ENV_VAR_NAMES.RETRY_MAX_DELAY],
      DEFAULT_RETRY_MAX_DELAY,
      1000,
      60000
    ),
  };
}

/**
 * Загрузка конфигурации из переменных окружения
 * @throws {Error} если обязательные переменные не установлены
 */
export function loadConfig(): ServerConfig {
  warnDeprecatedToolDiscoveryEnvVars();

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

  return {
    token: token.trim(),
    ...validatedOrgIds,
    ...buildApiConfig(),
    ...buildLoggingConfig(),
    ...buildToolsConfig(),
    ...buildRetryConfig(),
  };
}
