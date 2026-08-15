/**
 * Dependency Injection tokens for TickTick MCP Server
 *
 * InversifyJS uses symbols as unique identifiers for binding dependencies.
 *
 * L5 отчёта REVIEW_MCP_SDK_FINDINGS.md — рассмотрено и сознательно оставлено
 * как есть (не автогенерация, в отличие от tracker/wiki): у ticktick
 * Operation-символы читаются через литеральный dot-access `TYPES.XxxOperation`
 * в facade containers (`@inject(TYPES.GetTaskOperation)` и т.п., см.
 * `ticktick_api/facade/containers/*.container.ts`, `ticktick.facade.ts`).
 * Автогенерация символов через `Array.reduce` над списком классов даёт тип
 * `Record<string, symbol>` — TypeScript не выводит из него литеральные имена
 * свойств, поэтому `TYPES.GetTaskOperation` перестаёт тайпчекаться (проверено
 * эмпирически). У tracker эта же проблема решена ДВОЙНОЙ регистрацией
 * (symbol-based + class-based bind) и переводом потребителей на
 * `@inject(GetIssuesOperation)` (класс, а не символ) — это отдельный, более
 * широкий рефакторинг DI (переписать 13 сайтов инъекции + bindOperations),
 * непропорциональный этой находке. Ручной список ниже — дороже поддерживать
 * при росте числа операций, но безопаснее по типам без более крупного
 * рефакторинга инъекции.
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

  // === Raw API Operation (escape hatch, read-only) ===
  RawApiRequestOperation: Symbol.for('RawApiRequestOperation'),

  // === Operations Containers ===
  ProjectOperationsContainer: Symbol.for('ProjectOperationsContainer'),
  TaskOperationsContainer: Symbol.for('TaskOperationsContainer'),

  // === TickTick Facade ===
  TickTickFacade: Symbol.for('TickTickFacade'),

  // === Tool Registry ===
  ToolRegistry: Symbol.for('ToolRegistry'),

  // === MCP Resources (пакет 5.1.C.ticktick) ===
  TaskResourceProvider: Symbol.for('TaskResourceProvider'),
  ProjectResourceProvider: Symbol.for('ProjectResourceProvider'),
  ResourceRegistry: Symbol.for('ResourceRegistry'),

  // === MCP Prompts (пакет 5.1.C.ticktick) ===
  TickTickPromptProvider: Symbol.for('TickTickPromptProvider'),
  PromptRegistry: Symbol.for('PromptRegistry'),
} as const;
