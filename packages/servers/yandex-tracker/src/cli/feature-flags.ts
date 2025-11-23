/**
 * Feature flags для безопасного перехода на framework-based CLI
 */

/**
 * Использовать новый framework-based CLI
 *
 * Переключение:
 * - USE_FRAMEWORK_CLI=true - новый CLI (default)
 * - USE_FRAMEWORK_CLI=false - legacy CLI
 * - не установлено - новый CLI
 *
 * Примеры:
 * ```bash
 * # Использовать новый CLI (по умолчанию)
 * npm run mcp:connect
 *
 * # Откат на legacy CLI
 * USE_FRAMEWORK_CLI=false npm run mcp:connect
 * ```
 */
export const USE_FRAMEWORK_CLI = process.env['USE_FRAMEWORK_CLI'] !== 'false';

/**
 * Логировать информацию о миграции для отладки
 *
 * Примеры:
 * ```bash
 * # Включить отладочные логи
 * DEBUG_CLI_MIGRATION=true npm run mcp:connect
 * ```
 */
export const DEBUG_CLI_MIGRATION = process.env['DEBUG_CLI_MIGRATION'] === 'true';
