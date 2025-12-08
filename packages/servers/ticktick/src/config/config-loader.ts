/**
 * Configuration loader and validators for TickTick MCP Server
 */

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ServerConfig, LogLevel, ParsedCategoryFilter } from './server-config.interface.js';
import {
  DEFAULT_API_BASE_URL,
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
  DEFAULT_CACHE_TTL_MS,
  ENV_VAR_NAMES,
} from './constants.js';

// Path to project root (dist/ or src/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '../..');

/**
 * Validate log level
 */
function validateLogLevel(level: string): LogLevel {
  const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'silent'];
  if (validLevels.includes(level as LogLevel)) {
    return level as LogLevel;
  }
  return DEFAULT_LOG_LEVEL;
}

/**
 * Validate and parse timeout
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
 * Validate and parse max batch size
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
 * Validate and parse max concurrent requests
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
 * Validate tool discovery mode
 */
function validateToolDiscoveryMode(mode: string | undefined): 'lazy' | 'eager' {
  if (mode === 'eager' || mode === 'lazy') {
    return mode;
  }
  return DEFAULT_TOOL_DISCOVERY_MODE;
}

/**
 * Parse list of essential tools from environment variable
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
 * Parse tool category filter from environment variable
 *
 * Format: "tasks,projects" or "tasks:read,projects:write"
 *
 * Graceful degradation:
 * - Empty string or undefined → includeAll = true
 * - Invalid categories → skip (logging at higher level)
 * - Invalid format element → skip element
 *
 * @param value - value of ENABLED_TOOL_CATEGORIES env var
 * @returns Parsed filter structure
 */
function parseEnabledToolCategories(value: string | undefined): ParsedCategoryFilter {
  // Default: all categories
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
      // Format: "category:subcategory"
      const segments = part.split(':');

      // Validation: must be exactly 2 segments
      if (segments.length !== 2) {
        // Skip invalid format (e.g., "tasks::read" or "tasks:read:write")
        continue;
      }

      const [cat, subcat] = segments.map((s) => s.trim().toLowerCase());

      // Skip empty segments
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
      // Format: "category" (all subcategories)
      categories.add(part.toLowerCase());
    }
  }

  // If nothing was parsed, return includeAll=true
  const includeAll = categories.size === 0 && categoriesWithSubcategories.size === 0;

  return {
    categories,
    categoriesWithSubcategories,
    includeAll,
  };
}

/**
 * Parse list of disabled tool groups
 *
 * Format: "category" or "category:subcategory" comma-separated
 * Examples:
 * - "helpers:gtd,tasks:date" - disable GTD helpers and date queries
 * - "projects" - disable entire projects category
 *
 * @param value - value of DISABLED_TOOL_GROUPS env var
 * @returns Parsed structure of disabled groups
 */
function parseDisabledToolGroups(value: string | undefined): ParsedCategoryFilter | undefined {
  // If not specified or empty - nothing is disabled
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
      // Format: "category:subcategory"
      const segments = part.split(':');

      if (segments.length !== 2) {
        continue; // Skip invalid format
      }

      const [cat, subcat] = segments.map((s) => s.trim().toLowerCase());

      if (!cat || !subcat) {
        continue; // Skip empty segments
      }

      let subcategories = disabledCategoriesWithSubcategories.get(cat);
      if (!subcategories) {
        subcategories = new Set();
        disabledCategoriesWithSubcategories.set(cat, subcategories);
      }
      subcategories.add(subcat);
    } else {
      // Format: "category" (disable entire category)
      disabledCategories.add(part.toLowerCase());
    }
  }

  // If nothing was parsed, return undefined
  if (disabledCategories.size === 0 && disabledCategoriesWithSubcategories.size === 0) {
    return undefined;
  }

  return {
    categories: disabledCategories,
    categoriesWithSubcategories: disabledCategoriesWithSubcategories,
    includeAll: false, // This is disabled list, not enabled
  };
}

/**
 * Validate retry attempts
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
 * Validate retry delay
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
 * Validate cache TTL
 */
function validateCacheTtl(value: string | undefined, defaultValue: number): number {
  if (!value) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 0 || parsed > 3600000) {
    // max 1 hour
    return defaultValue;
  }
  return parsed;
}

/**
 * Build OAuth configuration
 */
function buildOAuthConfig(): ServerConfig['oauth'] {
  const clientId = process.env[ENV_VAR_NAMES.TICKTICK_CLIENT_ID];
  const clientSecret = process.env[ENV_VAR_NAMES.TICKTICK_CLIENT_SECRET];
  const accessToken = process.env[ENV_VAR_NAMES.TICKTICK_ACCESS_TOKEN];
  const refreshToken = process.env[ENV_VAR_NAMES.TICKTICK_REFRESH_TOKEN];

  // Validate credentials
  if (!accessToken && (!clientId || !clientSecret)) {
    throw new Error(
      `Either ${ENV_VAR_NAMES.TICKTICK_ACCESS_TOKEN} or both ` +
        `${ENV_VAR_NAMES.TICKTICK_CLIENT_ID} and ${ENV_VAR_NAMES.TICKTICK_CLIENT_SECRET} must be set. ` +
        'Get OAuth credentials from https://developer.ticktick.com'
    );
  }

  const config: ServerConfig['oauth'] = {
    clientId: clientId?.trim() ?? '',
    clientSecret: clientSecret?.trim() ?? '',
    redirectUri:
      process.env[ENV_VAR_NAMES.TICKTICK_REDIRECT_URI]?.trim() || 'http://localhost:3000/callback',
  };

  if (accessToken?.trim()) config.accessToken = accessToken.trim();
  if (refreshToken?.trim()) config.refreshToken = refreshToken.trim();

  return config;
}

/**
 * Build logging configuration
 */
function buildLoggingConfig(): ServerConfig['logging'] {
  const logsDirRaw = process.env[ENV_VAR_NAMES.LOGS_DIR]?.trim() || DEFAULT_LOGS_DIR;

  return {
    level: validateLogLevel(process.env[ENV_VAR_NAMES.LOG_LEVEL]?.trim() || DEFAULT_LOG_LEVEL),
    dir: resolve(PROJECT_ROOT, logsDirRaw),
    prettyLogs: process.env[ENV_VAR_NAMES.PRETTY_LOGS] === 'true',
    maxSize: parseInt(process.env[ENV_VAR_NAMES.LOG_MAX_SIZE] || String(DEFAULT_LOG_MAX_SIZE), 10),
    maxFiles: parseInt(
      process.env[ENV_VAR_NAMES.LOG_MAX_FILES] || String(DEFAULT_LOG_MAX_FILES),
      10
    ),
  };
}

/**
 * Build tools configuration
 */
function buildToolsConfig(): ServerConfig['tools'] {
  const enabledToolCategoriesRaw = process.env[ENV_VAR_NAMES.ENABLED_TOOL_CATEGORIES];
  const disabledToolGroupsRaw = process.env[ENV_VAR_NAMES.DISABLED_TOOL_GROUPS];

  const config: ServerConfig['tools'] = {
    discoveryMode: validateToolDiscoveryMode(process.env[ENV_VAR_NAMES.TOOL_DISCOVERY_MODE]),
    essentialTools: parseEssentialTools(process.env[ENV_VAR_NAMES.ESSENTIAL_TOOLS]),
  };

  if (enabledToolCategoriesRaw !== undefined) {
    config.enabledCategories = parseEnabledToolCategories(enabledToolCategoriesRaw);
  }
  const disabledGroups = parseDisabledToolGroups(disabledToolGroupsRaw);
  if (disabledGroups) {
    config.disabledGroups = disabledGroups;
  }

  return config;
}

/**
 * Build retry configuration
 */
function buildRetryConfig(): ServerConfig['retry'] {
  return {
    attempts: validateRetryAttempts(
      process.env[ENV_VAR_NAMES.RETRY_ATTEMPTS],
      DEFAULT_RETRY_ATTEMPTS
    ),
    minDelay: validateRetryDelay(
      process.env[ENV_VAR_NAMES.RETRY_MIN_DELAY],
      DEFAULT_RETRY_MIN_DELAY,
      100,
      5000
    ),
    maxDelay: validateRetryDelay(
      process.env[ENV_VAR_NAMES.RETRY_MAX_DELAY],
      DEFAULT_RETRY_MAX_DELAY,
      1000,
      60000
    ),
  };
}

/**
 * Load configuration from environment variables
 * @throws {Error} if required variables are not set
 */
export function loadConfig(): ServerConfig {
  return {
    oauth: buildOAuthConfig(),
    api: {
      baseUrl: process.env[ENV_VAR_NAMES.TICKTICK_API_BASE_URL]?.trim() || DEFAULT_API_BASE_URL,
    },
    batch: {
      maxBatchSize: validateMaxBatchSize(
        process.env[ENV_VAR_NAMES.MAX_BATCH_SIZE],
        DEFAULT_MAX_BATCH_SIZE
      ),
      maxConcurrentRequests: validateMaxConcurrentRequests(
        process.env[ENV_VAR_NAMES.MAX_CONCURRENT_REQUESTS],
        DEFAULT_MAX_CONCURRENT_REQUESTS
      ),
    },
    retry: buildRetryConfig(),
    cache: {
      ttlMs: validateCacheTtl(process.env[ENV_VAR_NAMES.CACHE_TTL_MS], DEFAULT_CACHE_TTL_MS),
    },
    tools: buildToolsConfig(),
    logging: buildLoggingConfig(),
    requestTimeout: validateTimeout(
      process.env[ENV_VAR_NAMES.REQUEST_TIMEOUT],
      DEFAULT_REQUEST_TIMEOUT
    ),
  };
}
