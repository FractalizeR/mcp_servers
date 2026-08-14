/**
 * MCP Server Adapter — публичный API
 */

export { createMcpServerAdapter } from './create-mcp-server-adapter.js';
export { buildMcpServer } from './build-mcp-server.js';
export type { McpServerAdapterOptions, McpServerAdapterHandle } from './types.js';
export { normalizeToolName } from './normalize-tool-name.js';
export type { NormalizedToolName } from './normalize-tool-name.js';
export { patchDiscoverServerInfo } from './discover-server-info.js';
export type { DiscoverableServer } from './discover-server-info.js';
export { SERVER_ICONS } from './server-icons.js';
