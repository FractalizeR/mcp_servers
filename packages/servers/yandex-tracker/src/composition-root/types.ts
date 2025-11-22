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
 * Автоматическая генерация символов для Tools с namespace префиксом
 *
 * Namespace "tool:" предотвращает коллизии имён с Operations и другими классами.
 */
export const TOOL_SYMBOLS = TOOL_CLASSES.reduce(
  (acc, ToolClass) => {
    const className = ToolClass.name;
    if (!className || className === '') {
      throw new Error(
        `Tool class must have a valid name for DI registration. Got: ${String(ToolClass)}`
      );
    }

    // Namespace prefix для избежания коллизий
    const symbolKey = `tool:${className}`;
    const symbol = Symbol.for(symbolKey);

    acc[className] = symbol;
    return acc;
  },
  {} as Record<string, symbol>
);

/**
 * Автоматическая генерация символов для Operations с namespace префиксом
 *
 * Namespace "operation:" предотвращает коллизии имён с Tools и другими классами.
 */
export const OPERATION_SYMBOLS = OPERATION_CLASSES.reduce(
  (acc, OperationClass) => {
    const className = OperationClass.name;
    if (!className || className === '') {
      throw new Error(
        `Operation class must have a valid name for DI registration. Got: ${String(OperationClass)}`
      );
    }

    // Namespace prefix для избежания коллизий
    const symbolKey = `operation:${className}`;
    const symbol = Symbol.for(symbolKey);

    acc[className] = symbol;
    return acc;
  },
  {} as Record<string, symbol>
);

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
