/**
 * Operations модуль - экспорт всех операций API
 */

// Base
export { BaseOperation } from '@domain/operations/base-operation.js';

// User operations
export { PingOperation } from '@domain/operations/user/ping.operation.js';
export type { PingResult } from './user/ping.operation.js';

// Issue operations (экспортируем только то, что есть в папке issue)
export * from '@domain/operations/issue/index.js';
