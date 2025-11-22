/**
 * Configuration module for Yandex Tracker server
 *
 * Provides server configuration loaded from environment variables.
 *
 * @example
 * ```typescript
 * import { loadConfig } from '#config';
 *
 * const config = loadConfig();
 * console.log(config.apiBase); // 'https://api.tracker.yandex.net'
 * ```
 */

// Types and interfaces
export type { ServerConfig, LogLevel, ParsedCategoryFilter } from './server-config.interface.js';

// Configuration loader
export { loadConfig } from './config-loader.js';

// Constants
export * from './constants.js';
