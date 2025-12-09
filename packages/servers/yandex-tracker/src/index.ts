/**
 * Yandex Tracker MCP Server
 *
 * Public API exports for library usage.
 * For running the MCP server, see server.ts
 */

import 'reflect-metadata';

// Config
export { loadConfig } from '#config';
export type { ServerConfig, LogLevel } from '#config';

// Constants
export { MCP_TOOL_PREFIX, MCP_SERVER_NAME, YANDEX_TRACKER_ESSENTIAL_TOOLS } from './constants.js';

// DI Container
export { createContainer, TYPES } from '#composition-root/index.js';

// Tracker API - Entities
export * from '#tracker_api/entities/index.js';

// Tracker API - DTOs
export * from '#tracker_api/dto/index.js';

// Tracker API - Facade
export { YandexTrackerFacade } from '#tracker_api/facade/index.js';

// Tool definitions (for validation scripts)
export { TOOL_CLASSES } from '#composition-root/definitions/tool-definitions.js';
export { OPERATION_CLASSES } from '#composition-root/definitions/operation-definitions.js';
