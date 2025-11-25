/**
 * Символы (токены) для Dependency Injection
 *
 * InversifyJS использует символы как уникальные идентификаторы
 * для привязки зависимостей в контейнере.
 */

import { TOOL_CLASSES } from './definitions/tool-definitions.js';
import { OPERATION_CLASSES } from './definitions/operation-definitions.js';

/**
 * Автоматическая генерация символов для Tools с namespace префиксом
 */
export const TOOL_SYMBOLS = TOOL_CLASSES.reduce(
  (acc, ToolClass) => {
    const className = ToolClass.name;
    if (!className || className === '') {
      throw new Error(
        `Tool class must have a valid name for DI registration. Got: ${String(ToolClass)}`
      );
    }

    const symbolKey = `tool:${className}`;
    const symbol = Symbol.for(symbolKey);

    acc[className] = symbol;
    return acc;
  },
  {} as Record<string, symbol>
);

/**
 * Автоматическая генерация символов для Operations с namespace префиксом
 */
export const OPERATION_SYMBOLS = OPERATION_CLASSES.reduce(
  (acc, OperationClass) => {
    const className = OperationClass.name;
    if (!className || className === '') {
      throw new Error(
        `Operation class must have a valid name for DI registration. Got: ${String(OperationClass)}`
      );
    }

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
  // Config & Infrastructure
  ServerConfig: Symbol.for('ServerConfig'),
  Logger: Symbol.for('Logger'),

  // HTTP Layer
  HttpClient: Symbol.for('HttpClient'),
  RetryStrategy: Symbol.for('RetryStrategy'),

  // Cache Layer
  CacheManager: Symbol.for('CacheManager'),

  // Yandex Wiki Facade
  YandexWikiFacade: Symbol.for('YandexWikiFacade'),

  // Tool Registry
  ToolRegistry: Symbol.for('ToolRegistry'),

  // Search Engine
  ToolSearchEngine: Symbol.for('ToolSearchEngine'),

  // Operations (автоматически сгенерированы)
  ...OPERATION_SYMBOLS,

  // Tools (автоматически сгенерированы)
  ...TOOL_SYMBOLS,
} as const;
