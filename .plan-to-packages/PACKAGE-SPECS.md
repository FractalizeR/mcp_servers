# 📦 Детальные спецификации пакетов

Полное описание каждого пакета с API, зависимостями и примерами.

---

## 1. @mcp-framework/infrastructure

### Описание
Переиспользуемый инфраструктурный слой: HTTP клиент, кеш, логирование, async утилиты.
**Domain-agnostic** — не знает о MCP или Yandex Tracker.

### Статистика
- **Файлов:** 20
- **Строк кода:** ~1391
- **Зависимости:** axios, pino, p-limit, rotating-file-stream
- **Размер пакета:** ~300-400KB

### Структура
```
packages/infrastructure/
├── src/
│   ├── http/
│   │   ├── client/
│   │   │   └── http-client.ts          # Axios wrapper
│   │   ├── retry/
│   │   │   ├── retry-handler.ts
│   │   │   ├── retry-strategy.interface.ts
│   │   │   └── exponential-backoff.strategy.ts
│   │   └── error/
│   │       └── error-mapper.ts         # AxiosError → ApiError
│   ├── cache/
│   │   ├── cache-manager.interface.ts
│   │   └── no-op-cache.ts              # Null Object
│   ├── async/
│   │   └── parallel-executor.ts        # Batch с throttling
│   ├── logging/
│   │   ├── logger.ts                   # Pino wrapper
│   │   └── README.md
│   ├── config.ts                       # loadConfig()
│   └── index.ts
├── tests/
├── package.json
├── tsconfig.json
└── README.md
```

### Экспорты
```typescript
// HTTP Layer
export { HttpClient } from './http/client/http-client.js';
export { RetryHandler } from './http/retry/retry-handler.js';
export { ExponentialBackoffStrategy } from './http/retry/exponential-backoff.strategy.js';
export type { RetryStrategy } from './http/retry/retry-strategy.interface.js';
export { ErrorMapper } from './http/error/error-mapper.js';

// Cache Layer
export type { CacheManager } from './cache/cache-manager.interface.js';
export { NoOpCache } from './cache/no-op-cache.js';

// Async
export { ParallelExecutor } from './async/parallel-executor.js';

// Logging
export { Logger } from './logging/logger.js';

// Config
export { loadConfig } from './config.js';
export type { ServerConfig } from './config.js';
```

### Использование
```typescript
import { HttpClient, Logger, ParallelExecutor } from '@mcp-framework/infrastructure';

const logger = new Logger({ level: 'info' });
const httpClient = new HttpClient(config, logger);
const executor = new ParallelExecutor(config);
```

---

## 2. @mcp-framework/core

### Описание
Базовые классы и утилиты для создания MCP tools.
Ядро framework, от которого зависят все остальные пакеты.

### Статистика
- **Файлов:** 16
- **Строк кода:** ~1185
- **Зависимости:** @modelcontextprotocol/sdk, zod, pino
- **Peer Dependencies:** inversify ^7.x
- **Размер пакета:** ~200-300KB

### Структура
```
packages/core/
├── src/
│   ├── tools/
│   │   ├── base/
│   │   │   ├── base-tool.ts            # BaseTool<TFacade>
│   │   │   ├── base-definition.ts      # BaseToolDefinition
│   │   │   ├── tool-metadata.ts        # Metadata types
│   │   │   └── index.ts
│   │   └── common/
│   │       ├── schemas/                # Zod schemas
│   │       │   ├── fields.schema.ts
│   │       │   ├── issue-key.schema.ts
│   │       │   └── expand.schema.ts
│   │       ├── processors/
│   │       │   └── batch-result-processor.ts
│   │       ├── loggers/
│   │       │   └── result-logger.ts
│   │       └── utils/
│   │           ├── response-field-filter.ts
│   │           ├── safety-warning-builder.ts
│   │           └── tool-name.ts
│   ├── utils/                          # MCP утилиты
│   ├── tool-registry.ts                # ToolRegistry
│   ├── types.ts                        # BatchResult, ToolResult, etc
│   └── index.ts
├── tests/
├── package.json
├── tsconfig.json
└── README.md
```

### Экспорты
```typescript
// Base classes
export { BaseTool } from './tools/base/base-tool.js';
export { BaseToolDefinition } from './tools/base/base-definition.js';
export { ToolCategory } from './tools/base/tool-metadata.js';
export type { StaticToolMetadata, ToolMetadata } from './tools/base/tool-metadata.js';

// Common utilities
export { BatchResultProcessor } from './tools/common/processors/batch-result-processor.js';
export { ResultLogger } from './tools/common/loggers/result-logger.js';
export { ResponseFieldFilter } from './tools/common/utils/response-field-filter.js';

// Schemas
export { FieldsSchema, IssueKeySchema } from './tools/common/schemas/index.js';

// Registry
export { ToolRegistry } from './tool-registry.js';

// Types
export type {
  BatchResult,
  FulfilledResult,
  RejectedResult,
  ToolResult,
  ToolCallParams
} from './types.js';
```

### Использование
```typescript
import { BaseTool, ToolCategory, type StaticToolMetadata } from '@mcp-framework/core';

export class MyTool extends BaseTool<MyFacade> {
  static override readonly METADATA: StaticToolMetadata = {
    name: 'my_tool',
    description: 'My custom tool',
    category: ToolCategory.CUSTOM,
    tags: ['example'],
    isHelper: false,
  };

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, MyParamsSchema);
    if (!validation.success) return validation.error;

    // ... ваша логика
  }
}
```

---

## 3. @mcp-framework/search

### Описание
Advanced Tool Search Engine с compile-time индексированием и 5 стратегиями поиска.
Уникальная фича framework.

### Статистика
- **Файлов:** 13
- **Строк кода:** ~1233
- **Зависимости:** @mcp-framework/core
- **Размер пакета:** ~150-200KB

### Структура
```
packages/search/
├── src/
│   ├── engine/
│   │   └── tool-search-engine.ts       # ToolSearchEngine + LRU cache
│   ├── strategies/
│   │   ├── search-strategy.interface.ts
│   │   ├── name-search.strategy.ts
│   │   ├── description-search.strategy.ts
│   │   ├── category-search.strategy.ts
│   │   ├── fuzzy-search.strategy.ts
│   │   └── weighted-combined.strategy.ts
│   ├── scoring/
│   │   └── fuzzy-scorer.ts
│   ├── tools/
│   │   ├── search-tools.tool.ts        # SearchToolsTool
│   │   ├── search-tools.definition.ts
│   │   └── search-tools.schema.ts
│   ├── generated-index.ts              # Auto-generated
│   ├── types.ts
│   ├── constants.ts
│   └── index.ts
├── scripts/
│   └── generate-tool-index.ts          # Prebuild script
├── tests/
├── package.json
├── tsconfig.json
└── README.md
```

### Экспорты
```typescript
// Search Engine
export { ToolSearchEngine } from './engine/tool-search-engine.js';

// Strategies
export type { ISearchStrategy } from './strategies/search-strategy.interface.js';
export { NameSearchStrategy } from './strategies/name-search.strategy.js';
export { DescriptionSearchStrategy } from './strategies/description-search.strategy.js';
export { CategorySearchStrategy } from './strategies/category-search.strategy.js';
export { FuzzySearchStrategy } from './strategies/fuzzy-search.strategy.js';
export { WeightedCombinedStrategy } from './strategies/weighted-combined.strategy.js';

// Search Tool
export { SearchToolsTool } from './tools/search-tools.tool.js';

// Types
export type { SearchParams, SearchResponse, SearchResult } from './types.js';

// Generated index (для использования)
export { TOOL_SEARCH_INDEX } from './generated-index.js';
```

### Использование
```typescript
import {
  ToolSearchEngine,
  WeightedCombinedStrategy,
  TOOL_SEARCH_INDEX
} from '@mcp-framework/search';
import type { ToolRegistry } from '@mcp-framework/core';

const searchEngine = new ToolSearchEngine(
  TOOL_SEARCH_INDEX,
  toolRegistry,
  new WeightedCombinedStrategy()
);

const results = searchEngine.search({
  query: 'найти задачи',
  limit: 10
});
```

---

## 4. @mcp-framework/cli

### Описание
CLI инструмент для автоматического подключения MCP серверов к Claude Desktop, Claude Code, Codex.

### Статистика
- **Файлов:** 17
- **Строк кода:** ~1450
- **Зависимости:** commander, inquirer, chalk, ora, @iarna/toml
- **Размер пакета:** ~100-150KB (без node_modules)

### Структура
```
packages/cli/
├── src/
│   ├── connectors/
│   │   ├── base/
│   │   │   ├── connector.interface.ts
│   │   │   └── base-connector.ts
│   │   ├── claude-desktop/
│   │   │   └── claude-desktop.connector.ts
│   │   ├── claude-code/
│   │   │   └── claude-code.connector.ts
│   │   ├── codex/
│   │   │   └── codex.connector.ts
│   │   └── registry.ts
│   ├── commands/
│   │   ├── connect.command.ts
│   │   ├── disconnect.command.ts
│   │   ├── status.command.ts
│   │   ├── list.command.ts
│   │   └── validate.command.ts
│   ├── utils/
│   │   ├── config-manager.ts
│   │   ├── file-manager.ts
│   │   ├── command-executor.ts
│   │   ├── interactive-prompter.ts
│   │   └── logger.ts
│   ├── bin/
│   │   └── mcp-connect.ts              # CLI entry point
│   └── index.ts
├── tests/
├── package.json
├── tsconfig.json
└── README.md
```

### Экспорты
```typescript
// Connectors
export type { MCPConnector, MCPClientInfo } from './connectors/base/connector.interface.js';
export { BaseConnector } from './connectors/base/base-connector.js';
export { ConnectorRegistry } from './connectors/registry.js';
export { ClaudeDesktopConnector } from './connectors/claude-desktop/claude-desktop.connector.js';
export { ClaudeCodeConnector } from './connectors/claude-code/claude-code.connector.js';
export { CodexConnector } from './connectors/codex/codex.connector.js';

// Commands (для программного использования)
export { connectCommand } from './commands/connect.command.js';
export { disconnectCommand } from './commands/disconnect.command.js';
export { statusCommand } from './commands/status.command.js';

// Utils
export { ConfigManager } from './utils/config-manager.js';
export { FileManager } from './utils/file-manager.js';
```

### Использование как CLI
```bash
npm install -g @mcp-framework/cli

mcp-connect connect --client claude-desktop
mcp-connect disconnect
mcp-connect status
mcp-connect list
```

### Использование как библиотека
```typescript
import { ConnectorRegistry, ClaudeDesktopConnector } from '@mcp-framework/cli';

const registry = new ConnectorRegistry();
const connector = registry.get('claude-desktop');

await connector.connect({
  serverName: 'my-mcp-server',
  entryPoint: 'node dist/index.js',
  token: 'your-token',
  orgId: 'your-org'
});
```

---

## 5. mcp-server-yandex-tracker

### Описание
Конкретная реализация MCP сервера для Yandex Tracker API.
Использует все framework пакеты.

### Статистика
- **Файлов:** 83
- **Строк кода:** ~4756
- **Зависимости:** @mcp-framework/*, inversify
- **Размер пакета:** ~500-700KB

### Структура
```
packages/yandex-tracker/
├── src/
│   ├── tracker_api/
│   │   ├── entities/               # Issue, User, Queue, etc
│   │   ├── dto/                    # CreateIssueDto, UpdateIssueDto
│   │   ├── api_operations/         # API operations
│   │   └── facade/                 # YandexTrackerFacade
│   ├── tools/
│   │   ├── api/                    # API tools (get, create, update)
│   │   └── helpers/                # Helper tools (demo, issue-url)
│   ├── composition-root/
│   │   ├── types.ts                # DI tokens
│   │   ├── container.ts            # DI container
│   │   └── definitions/            # Tool/Operation definitions
│   ├── constants.ts
│   └── index.ts                    # MCP Server entry point
├── scripts/
│   └── smoke-test-server.ts
├── tests/
├── package.json
├── tsconfig.json
├── README.md
├── CLAUDE.md
└── ARCHITECTURE.md
```

### Зависимости
```json
{
  "dependencies": {
    "@mcp-framework/core": "workspace:*",
    "@mcp-framework/search": "workspace:*",
    "@mcp-framework/infrastructure": "workspace:*",
    "@mcp-framework/cli": "workspace:*",
    "inversify": "^7.10.4"
  }
}
```

### Экспорты (для расширения)
```typescript
// Facade
export { YandexTrackerFacade } from './tracker_api/facade/yandex-tracker.facade.js';

// Entities
export type { Issue, User, Queue } from './tracker_api/entities/index.js';

// DTO
export type { CreateIssueDto, UpdateIssueDto } from './tracker_api/dto/index.js';

// Tools (для переиспользования в других серверах)
export { GetIssuesTool } from './tools/api/issues/get/get-issues.tool.js';
export { CreateIssueTool } from './tools/api/issues/create/create-issue.tool.js';
```

### Использование
```bash
# Установить
npm install mcp-server-yandex-tracker

# Настроить env
export YANDEX_TRACKER_TOKEN=your-token
export YANDEX_ORG_ID=your-org

# Запустить
npx mcp-server-yandex-tracker

# Или через CLI
mcp-connect connect --client claude-desktop
```

---

## 📊 Сравнительная таблица

| Пакет | Размер | Файлов | Зависимостей | Публичный API |
|-------|--------|--------|--------------|---------------|
| infrastructure | ~350KB | 20 | 5 | 15+ exports |
| core | ~250KB | 16 | 3 | 20+ exports |
| search | ~180KB | 13 | 1 (core) | 10+ exports |
| cli | ~120KB | 17 | 5 | 12+ exports |
| yandex-tracker | ~600KB | 83 | 5 (framework) | 30+ exports |

---

## 🔗 Граф зависимостей

```
External Packages
      ↓
infrastructure (HTTP, logging) ←──┐
      ↓                            │
core (BaseTool, registry) ←────┐  │
      ↓                         │  │
search (Tool Search) ←─────────┤  │
      ↓                         │  │
cli (MCP connectors) ──────────┘  │
      ↓                            │
yandex-tracker (implementation) ───┘
```

---

## 📝 Примеры интеграции

### Создать новый MCP сервер на базе framework

```typescript
// 1. Создать свой facade
import { BaseTool } from '@mcp-framework/core';

class MyServiceFacade {
  async getData(): Promise<Data[]> { /* ... */ }
}

// 2. Создать tools
class MyTool extends BaseTool<MyServiceFacade> {
  static override readonly METADATA = {
    name: 'my_tool',
    description: 'Get data',
    category: ToolCategory.CUSTOM,
    tags: ['data'],
    isHelper: false,
  };

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const data = await this.facade.getData();
    return this.formatSuccess(data);
  }
}

// 3. Использовать infrastructure
import { HttpClient, Logger } from '@mcp-framework/infrastructure';

// 4. Добавить Tool Search
import { ToolSearchEngine, TOOL_SEARCH_INDEX } from '@mcp-framework/search';

// 5. Использовать CLI для подключения
import { ConnectorRegistry } from '@mcp-framework/cli';
```

---

Используйте эти спецификации как референс при разработке!
