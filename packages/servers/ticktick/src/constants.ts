/**
 * Global constants for TickTick MCP Server
 */

/**
 * Base project name (without prefixes)
 * Used for building other names
 * @example "fractalizer_mcp_ticktick"
 */
export const PROJECT_BASE_NAME = 'fractalizer_mcp_ticktick' as const;

/**
 * MCP server name (used in client configurations)
 * @example "fractalizer_mcp_ticktick" in mcpServers config
 */
export const MCP_SERVER_NAME = PROJECT_BASE_NAME;

/**
 * Prefix for MCP tool names
 * @example "fr_ticktick_get_tasks"
 */
export const MCP_TOOL_PREFIX = 'fr_ticktick_' as const;

/**
 * Essential tools for TickTick (with correct prefixes)
 *
 * ✅ Names include prefixes where needed:
 * - 'fr_ticktick_ping' - ticktick tool (with prefix)
 * - 'search_tools' - framework tool (WITHOUT prefix)
 */
export const TICKTICK_ESSENTIAL_TOOLS = ['fr_ticktick_ping', 'search_tools'] as const;

/**
 * Display name of the MCP server
 */
export const MCP_SERVER_DISPLAY_NAME = "FractalizeR's TickTick MCP" as const;

/**
 * MCP server description
 */
export const MCP_SERVER_DESCRIPTION = 'MCP server for TickTick todo-list API integration' as const;

/**
 * Project author
 */
export const PROJECT_AUTHOR = 'FractalizeR' as const;

/**
 * Author email
 */
export const PROJECT_AUTHOR_EMAIL = 'fractalizer@example.com' as const;

/**
 * Project homepage
 */
export const PROJECT_HOMEPAGE = 'https://github.com/FractalizeR/mcp_servers' as const;

/**
 * Project repository URL
 */
export const PROJECT_REPOSITORY_URL = 'https://github.com/FractalizeR/mcp_servers' as const;

/**
 * Path to MCP server entry point (relative to project root)
 */
export const SERVER_ENTRY_POINT = 'dist/index.js' as const;

/**
 * Configuration constants re-exported from config module
 * @deprecated Import directly from '#config' instead
 */
export {
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
  DEFAULT_CACHE_TTL_MS,
  ENV_VAR_NAMES,
} from '#config';
