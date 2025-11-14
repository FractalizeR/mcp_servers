/**
 * Символы (токены) для Dependency Injection
 *
 * InversifyJS использует символы как уникальные идентификаторы
 * для привязки зависимостей в контейнере.
 */

export const TYPES = {
  // === Config & Infrastructure ===
  ServerConfig: Symbol.for('ServerConfig'),
  Logger: Symbol.for('Logger'),

  // === HTTP Layer ===
  HttpClient: Symbol.for('HttpClient'),
  RetryStrategy: Symbol.for('RetryStrategy'),
  RetryHandler: Symbol.for('RetryHandler'),

  // === Cache Layer ===
  CacheManager: Symbol.for('CacheManager'),

  // === Yandex Tracker Operations ===
  PingOperation: Symbol.for('PingOperation'),
  GetIssuesOperation: Symbol.for('GetIssuesOperation'),

  // === Yandex Tracker Facade ===
  YandexTrackerFacade: Symbol.for('YandexTrackerFacade'),

  // === Tools ===
  PingTool: Symbol.for('PingTool'),
  GetIssuesTool: Symbol.for('GetIssuesTool'),

  // === Tool Registry ===
  ToolRegistry: Symbol.for('ToolRegistry'),
} as const;
