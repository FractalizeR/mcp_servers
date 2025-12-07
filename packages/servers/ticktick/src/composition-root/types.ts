/**
 * Dependency Injection tokens for TickTick MCP Server
 *
 * InversifyJS uses symbols as unique identifiers for binding dependencies.
 *
 * NOTE:
 * - Symbols for Tools and Operations will be auto-generated in future stages
 * - This file contains base infrastructure tokens
 */

/**
 * All DI tokens for the project
 */
export const TYPES = {
  // === Config & Infrastructure ===
  ServerConfig: Symbol.for('ServerConfig'),
  Logger: Symbol.for('Logger'),

  // === OAuth Layer ===
  OAuthClient: Symbol.for('OAuthClient'),

  // === HTTP Layer ===
  HttpClient: Symbol.for('HttpClient'),
  RetryStrategy: Symbol.for('RetryStrategy'),

  // === Cache Layer ===
  CacheManager: Symbol.for('CacheManager'),

  // === TickTick Facade (will be added in stage 3) ===
  TickTickFacade: Symbol.for('TickTickFacade'),

  // === Tool Registry (will be added in stage 5) ===
  ToolRegistry: Symbol.for('ToolRegistry'),

  // === Search Engine (will be added in stage 5) ===
  ToolSearchEngine: Symbol.for('ToolSearchEngine'),
} as const;
