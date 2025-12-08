/**
 * Dependency Injection tokens for TickTick MCP Server
 *
 * InversifyJS uses symbols as unique identifiers for binding dependencies.
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

  // === Project Operations ===
  GetProjectsOperation: Symbol.for('GetProjectsOperation'),
  GetProjectOperation: Symbol.for('GetProjectOperation'),
  GetProjectDataOperation: Symbol.for('GetProjectDataOperation'),
  CreateProjectOperation: Symbol.for('CreateProjectOperation'),
  UpdateProjectOperation: Symbol.for('UpdateProjectOperation'),
  DeleteProjectOperation: Symbol.for('DeleteProjectOperation'),

  // === Task Operations ===
  GetTaskOperation: Symbol.for('GetTaskOperation'),
  GetTasksOperation: Symbol.for('GetTasksOperation'),
  CreateTaskOperation: Symbol.for('CreateTaskOperation'),
  UpdateTaskOperation: Symbol.for('UpdateTaskOperation'),
  DeleteTaskOperation: Symbol.for('DeleteTaskOperation'),
  CompleteTaskOperation: Symbol.for('CompleteTaskOperation'),

  // === Operations Containers ===
  ProjectOperationsContainer: Symbol.for('ProjectOperationsContainer'),
  TaskOperationsContainer: Symbol.for('TaskOperationsContainer'),

  // === TickTick Facade ===
  TickTickFacade: Symbol.for('TickTickFacade'),

  // === Tool Registry (will be added in stage 5) ===
  ToolRegistry: Symbol.for('ToolRegistry'),

  // === Search Engine (will be added in stage 5) ===
  ToolSearchEngine: Symbol.for('ToolSearchEngine'),
} as const;
