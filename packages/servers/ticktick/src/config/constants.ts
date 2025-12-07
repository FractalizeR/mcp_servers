/**
 * Configuration constants for TickTick MCP server
 *
 * Moved from @mcp-framework/infrastructure to maintain clean separation:
 * Infrastructure layer should not contain domain-specific code
 */

/**
 * Default configuration values
 */
export const DEFAULT_API_BASE_URL = 'https://api.ticktick.com/open/v1' as const;
export const DEFAULT_OAUTH_AUTHORIZE_URL = 'https://ticktick.com/oauth/authorize' as const;
export const DEFAULT_OAUTH_TOKEN_URL = 'https://ticktick.com/oauth/token' as const;

// Dida365 (Chinese version) endpoints
export const DIDA365_API_BASE_URL = 'https://api.dida365.com/open/v1' as const;
export const DIDA365_OAUTH_AUTHORIZE_URL = 'https://dida365.com/oauth/authorize' as const;
export const DIDA365_OAUTH_TOKEN_URL = 'https://dida365.com/oauth/token' as const;

export const DEFAULT_LOG_LEVEL = 'info' as const;
export const DEFAULT_REQUEST_TIMEOUT = 30000 as const;
export const DEFAULT_MAX_BATCH_SIZE = 100 as const;
export const DEFAULT_MAX_CONCURRENT_REQUESTS = 5 as const;
export const DEFAULT_LOGS_DIR = './logs' as const;
export const DEFAULT_LOG_MAX_SIZE = 51200 as const; // 50KB in bytes
export const DEFAULT_LOG_MAX_FILES = 20 as const;
export const DEFAULT_TOOL_DISCOVERY_MODE = 'eager' as const;
export const DEFAULT_ESSENTIAL_TOOLS = ['fr_ticktick_ping', 'search_tools'] as const;
export const DEFAULT_RETRY_ATTEMPTS = 3 as const;
export const DEFAULT_RETRY_MIN_DELAY = 1000 as const; // 1 second
export const DEFAULT_RETRY_MAX_DELAY = 10000 as const; // 10 seconds
export const DEFAULT_CACHE_TTL_MS = 300000 as const; // 5 minutes

/**
 * Environment variable names
 */
export const ENV_VAR_NAMES = {
  // OAuth 2.0
  TICKTICK_CLIENT_ID: 'TICKTICK_CLIENT_ID',
  TICKTICK_CLIENT_SECRET: 'TICKTICK_CLIENT_SECRET',
  TICKTICK_REDIRECT_URI: 'TICKTICK_REDIRECT_URI',
  TICKTICK_ACCESS_TOKEN: 'TICKTICK_ACCESS_TOKEN',
  TICKTICK_REFRESH_TOKEN: 'TICKTICK_REFRESH_TOKEN',

  // API
  TICKTICK_API_BASE_URL: 'TICKTICK_API_BASE_URL',

  // Logging
  LOG_LEVEL: 'LOG_LEVEL',
  LOGS_DIR: 'LOGS_DIR',
  PRETTY_LOGS: 'PRETTY_LOGS',
  LOG_MAX_SIZE: 'LOG_MAX_SIZE',
  LOG_MAX_FILES: 'LOG_MAX_FILES',

  // Performance
  REQUEST_TIMEOUT: 'REQUEST_TIMEOUT',
  MAX_BATCH_SIZE: 'MAX_BATCH_SIZE',
  MAX_CONCURRENT_REQUESTS: 'MAX_CONCURRENT_REQUESTS',

  // Retry
  RETRY_ATTEMPTS: 'TICKTICK_RETRY_ATTEMPTS',
  RETRY_MIN_DELAY: 'TICKTICK_RETRY_MIN_DELAY',
  RETRY_MAX_DELAY: 'TICKTICK_RETRY_MAX_DELAY',

  // Cache
  CACHE_TTL_MS: 'CACHE_TTL_MS',

  // Tool Discovery
  TOOL_DISCOVERY_MODE: 'TOOL_DISCOVERY_MODE',
  ESSENTIAL_TOOLS: 'ESSENTIAL_TOOLS',
  ENABLED_TOOL_CATEGORIES: 'ENABLED_TOOL_CATEGORIES',
  DISABLED_TOOL_GROUPS: 'DISABLED_TOOL_GROUPS',
} as const;
