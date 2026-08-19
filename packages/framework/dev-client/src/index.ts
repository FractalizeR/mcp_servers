/**
 * @fractalizer/mcp-dev-client
 *
 * Dev-only MCP client: собрать запуск (локальный бандл + секреты из записи
 * MCP-клиента), открыть настоящую MCP-сессию, перечислить инструменты,
 * вызвать инструмент — не печатая секретов и не запуская чужой или
 * устаревший код.
 *
 * `private: true` — пакет не публикуется в npm, серверы этого монорепо
 * подключают его как devDependency.
 *
 * @packageDocumentation
 */

export * from './launch/index.js';
export * from './secrets/index.js';
export * from './write-policy/index.js';
export * from './session/index.js';
export * from './batch/index.js';
