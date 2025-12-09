/**
 * TickTick MCP Server
 *
 * Public API exports for library usage.
 * For running the MCP server, see server.ts
 */

import 'reflect-metadata';

// Config
export { loadConfig } from '#config';
export type { ServerConfig } from '#config';

// Constants
export { MCP_TOOL_PREFIX, MCP_SERVER_NAME, TICKTICK_ESSENTIAL_TOOLS } from './constants.js';

// DI Container
export { createContainer } from '#composition-root/container.js';
export { TYPES } from '#composition-root/types.js';

// TickTick API - Entities
export * from '#ticktick_api/entities/index.js';

// TickTick API - DTOs
export * from '#ticktick_api/dto/index.js';

// TickTick API - Facade
export { TickTickFacade } from '#ticktick_api/facade/index.js';

// Tool definitions (for validation scripts)
export { TOOL_CLASSES } from '#composition-root/definitions/tool-definitions.js';
