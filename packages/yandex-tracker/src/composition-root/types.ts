/**
 * Символы (токены) для Dependency Injection
 *
 * InversifyJS использует символы как уникальные идентификаторы
 * для привязки зависимостей в контейнере.
 *
 * ВАЖНО:
 * - Символы для Tools и Operations генерируются АВТОМАТИЧЕСКИ из классов
 * - При добавлении нового Tool/Operation — добавь класс в definitions/
 * - НЕ добавляй символы сюда вручную для Tools/Operations
 */

import { TOOL_CLASSES } from './definitions/tool-definitions.js';
import { OPERATION_CLASSES } from './definitions/operation-definitions.js';

/**
 * Автоматическая генерация символов для Tools
 */
const TOOL_SYMBOLS = Object.fromEntries(
  TOOL_CLASSES.map((ToolClass) => [ToolClass.name, Symbol.for(ToolClass.name)])
) as Record<string, symbol>;

/**
 * Автоматическая генерация символов для Operations
 */
const OPERATION_SYMBOLS = Object.fromEntries(
  OPERATION_CLASSES.map((OperationClass) => [OperationClass.name, Symbol.for(OperationClass.name)])
) as Record<string, symbol>;

/**
 * Все DI токены проекта
 */
export const TYPES = {
  // === Config & Infrastructure ===
  ServerConfig: Symbol.for('ServerConfig'),
  Logger: Symbol.for('Logger'),

  // === HTTP Layer ===
  HttpClient: Symbol.for('HttpClient'),
  RetryStrategy: Symbol.for('RetryStrategy'),

  // === Cache Layer ===
  CacheManager: Symbol.for('CacheManager'),

  // === Yandex Tracker Facade ===
  YandexTrackerFacade: Symbol.for('YandexTrackerFacade'),

  // === Tool Registry ===
  ToolRegistry: Symbol.for('ToolRegistry'),

  // === Search Engine ===
  ToolSearchEngine: Symbol.for('ToolSearchEngine'),

  // === Operations (автоматически сгенерированы) ===
  ...OPERATION_SYMBOLS,

  // === Tools (автоматически сгенерированы) ===
  ...TOOL_SYMBOLS,
} as const;
