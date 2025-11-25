/**
 * MCP Server для Yandex Wiki
 *
 * Entry point для запуска сервера
 */

import 'reflect-metadata';

// Config
export { loadConfig } from '#config';
export type { ServerConfig, LogLevel } from '#config';

// Constants
export { MCP_TOOL_PREFIX, YANDEX_WIKI_API_BASE } from '#constants';

// DI Container
export { createContainer, TYPES } from '#composition-root/index.js';

// Wiki API - Entities
export * from '#wiki_api/entities/index.js';

// Wiki API - DTOs
export * from '#wiki_api/dto/index.js';

// Wiki API - Facade
export { YandexWikiFacade, PageService } from '#wiki_api/facade/index.js';

// Tools - classes only (not schemas to avoid conflicts)
export {
  GetPageTool,
  GetPageByIdTool,
  CreatePageTool,
  UpdatePageTool,
  DeletePageTool,
  ClonePageTool,
  AppendContentTool,
  PingTool,
} from '#tools/index.js';
