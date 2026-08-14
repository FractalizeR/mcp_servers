/**
 * Server configuration types and interfaces for TickTick MCP
 */

/**
 * Parsed structure for tool category filter
 *
 * Used for filtering tools in tools/list endpoint.
 *
 * Usage examples:
 * - includeAll=true: all categories
 * - categories=['tasks', 'projects']: only tasks and projects (all subcategories)
 * - categoriesWithSubcategories={'tasks': ['read', 'write']}: only tasks/read and tasks/write
 */
export interface ParsedCategoryFilter {
  /** Categories without subcategories (all subcategories included) */
  categories: Set<string>;

  /** Categories with specific subcategories */
  categoriesWithSubcategories: Map<string, Set<string>>;

  /** Include all categories (empty filter) */
  includeAll: boolean;
}

/**
 * OAuth 2.0 configuration
 */
export interface OAuthConfig {
  /** OAuth client ID */
  clientId: string;
  /** OAuth client secret */
  clientSecret: string;
  /** OAuth redirect URI */
  redirectUri: string;
  /** Current access token (if available) */
  accessToken?: string;
  /** Current refresh token (if available) */
  refreshToken?: string;
}

/**
 * API configuration
 */
export interface ApiConfig {
  /** Base URL for TickTick API */
  baseUrl: string;
}

/**
 * Batch operation configuration
 */
export interface BatchConfig {
  /** Maximum items in one batch request (business limit) */
  maxBatchSize: number;
  /** Maximum concurrent HTTP requests (technical limit, throttling) */
  maxConcurrentRequests: number;
}

/**
 * Retry configuration for HTTP requests
 */
export interface RetryConfig {
  /** Maximum retry attempts */
  attempts: number;
  /** Minimum delay between retries in ms */
  minDelay: number;
  /** Maximum delay between retries in ms */
  maxDelay: number;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Cache TTL in milliseconds */
  ttlMs: number;
}

/**
 * Tool visibility/callability configuration
 */
export interface ToolsConfig {
  /**
   * Disabled tool groups (единственный рубильник, negative filter)
   *
   * `tools/list` always returns the full set of tools, filtered only by this —
   * progressive disclosure (essential tools, lazy discovery, positive category
   * filter) has been removed: the primary consumers are finished MCP clients
   * (Claude Code, Claude Desktop, Codex) that already implement tool discovery
   * on their side.
   *
   * Format: "category" or "category:subcategory" comma-separated
   * Examples:
   * - "helpers:gtd,tasks:date" - disable GTD and date query tools
   *
   * A disabled group is not only hidden from tools/list but also not callable —
   * see `ConfiguredToolAccessPolicy`.
   */
  disabledGroups?: ParsedCategoryFilter;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  /** Log level */
  level: LogLevel;
  /** Directory for log files */
  dir: string;
  /** Enable pretty-printing logs (for development) */
  prettyLogs: boolean;
  /** Maximum log file size in bytes (default: 50KB) */
  maxSize: number;
  /** Number of rotated log files (default: 20) */
  maxFiles: number;
}

/**
 * Server configuration from environment variables
 */
export interface ServerConfig {
  /** OAuth configuration */
  oauth: OAuthConfig;
  /** API configuration */
  api: ApiConfig;
  /** Batch operation configuration */
  batch: BatchConfig;
  /** Retry configuration */
  retry: RetryConfig;
  /** Cache configuration */
  cache: CacheConfig;
  /** Tool discovery configuration */
  tools: ToolsConfig;
  /** Logging configuration */
  logging: LoggingConfig;
  /** Request timeout in milliseconds */
  requestTimeout: number;
}

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';
