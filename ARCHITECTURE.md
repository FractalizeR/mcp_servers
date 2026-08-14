# Architecture: MCP Framework & Yandex Tracker Server

**Monorepo Architecture Overview**

---

## 🎯 Monorepo Principles

### 1. Package Independence
Каждый пакет может быть опубликован и использован независимо.

### 2. Clear Dependency Graph
Строгая иерархия зависимостей без циклов.

### 3. Shared Infrastructure
Общие компоненты (infrastructure, core) переиспользуются.

### 4. Topological Build Order
Сборка автоматически учитывает зависимости пакетов.

---

## 📦 Monorepo Structure

```
packages/
├── framework/
│   ├── infrastructure/     → @fractalizer/mcp-infrastructure
│   │   ├── http/, cache/, async/, logging/
│   │   └── 0 dependencies
│   ├── cli/               → @fractalizer/mcp-cli
│   │   └── depends on: infrastructure
│   └── core/              → @fractalizer/mcp-core
│       ├── tools/base/, utils/, tool-registry
│       └── depends on: infrastructure
└── servers/
    └── yandex-tracker/    → mcp-server-yandex-tracker
        ├── api_operations/, entities/, tools/, composition-root/
        └── depends on: infrastructure, cli, core
```

---

## 🔗 Dependency Graph

```
┌─────────────────┐
│ infrastructure  │ ← Base layer (HTTP, logging, cache, async)
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│      core       │ ← Framework core (BaseTool, registry, utilities)
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ yandex-tracker  │ ← Application (Yandex.Tracker integration)
└─────────────────┘
```

**Rules:**
- ❌ No reverse dependencies (core → infrastructure)
- ❌ No imports from yandex-tracker to framework packages
- ✅ Dependencies flow top-down only

**Validation:**
```bash
npm run depcruise  # Validates dependency graph
```

---

## 📦 Package Details

### @fractalizer/mcp-infrastructure

**Purpose:** Reusable infrastructure layer (domain-agnostic)

**Components:**
- **HTTP Layer:** HttpClient (Axios wrapper), RetryHandler, ErrorMapper
- **Caching:** CacheManager interface, NoOpCache
- **Async:** ParallelExecutor (batch throttling)
- **Logging:** Pino with rotating-file-stream
- **Config:** Environment variable loading and validation

**Key Principle:** Infrastructure does NOT know about domain (Yandex.Tracker, MCP)

**Details:** [packages/framework/infrastructure/README.md](packages/framework/infrastructure/README.md)

### @fractalizer/mcp-core

**Purpose:** Core framework for building MCP tools

**Components:**
- **Base Classes:** BaseTool<TFacade>, BaseDefinition
- **Tool Registry:** ToolRegistry (lazy initialization)
- **Utilities:** ResponseFieldFilter, BatchResultProcessor, ResultLogger
- **Schemas:** Common Zod schemas (fields, expand, issue-key)

**Key Principle:** Generic `BaseTool<TFacade>` — facade-agnostic design

**Details:** [packages/framework/core/README.md](packages/framework/core/README.md)

### mcp-server-yandex-tracker

**Purpose:** Complete MCP server for Yandex.Tracker API v3

**Components:**
- **API Operations:** Batch operations for issues, users, comments
- **Entities:** Domain types (Issue, User, Queue, etc.)
- **DTO:** Data Transfer Objects (create, update requests)
- **MCP Tools:** API tools + helpers
- **DI:** InversifyJS composition root

**Key Principle:** Built on framework packages (infrastructure, cli, core)

**Details:** [packages/servers/yandex-tracker/README.md](packages/servers/yandex-tracker/README.md), [packages/servers/yandex-tracker/CLAUDE.md](packages/servers/yandex-tracker/CLAUDE.md)

---

## 🏗️ Architectural Principles (Shared)

### 1. Feature-by-Folder
Группируем файлы по функциональности, а не по типу.

**✅ Правильно:**
```
api/http/retry/
├── retry-handler.ts
├── retry-strategy.interface.ts
└── exponential-backoff.strategy.ts
```

**❌ Неправильно:**
```
strategies/
└── exponential-backoff.ts
handlers/
└── retry-handler.ts
```

### 2. Single Responsibility Principle (SRP)
Каждый класс/файл отвечает ТОЛЬКО за одну задачу.

### 3. Dependency Injection
Все зависимости через конструктор (InversifyJS в yandex-tracker).

### 4. Interface Segregation
Минимальные, специфичные интерфейсы.

### 5. Open/Closed Principle
Открыто для расширения, закрыто для модификации.

---

## 📥 Module System: Node.js Subpath Imports

**Решение (2025):** Проект использует Node.js Subpath Imports вместо TypeScript path aliases.

### Почему Subpath Imports?

1. **Нативная поддержка Node.js** (12.19.0+) - не требует tsc-alias для внутренних импортов
2. **Рекомендация Turborepo team** для monorepo проектов
3. **Одна точка конфигурации** - только package.json (не нужны tsconfig paths)
4. **Полная поддержка TypeScript 5.4+** - автокомплит, LSP, навигация
5. **Избежание конфликтов** - префикс `#` не конфликтует с npm scoped packages

### Конфигурация

**package.json (yandex-tracker):**
```json
{
  "imports": {
    "#tracker_api/*": "./src/tracker_api/*",
    "#tools/*": "./src/tools/*",
    "#composition-root/*": "./src/composition-root/*",
    "#cli/*": "./src/cli/*",
    "#constants": "./src/constants.ts",
    "#common/*": "./src/common/*",
    "#integration/*": "./tests/integration/*",
    "#helpers/*": "./tests/helpers/*"
  }
}
```

### Правила импортов

**1. Междупакетные (npm package names):**
```typescript
import { BaseTool } from '@fractalizer/mcp-core';
import { HttpClient } from '@fractalizer/mcp-infrastructure';
```

**2. Внутрипакетные короткие (≤2 уровня - относительные пути):**
```typescript
import { validateInput } from './utils.js';
import { BaseOperation } from '../base-operation.js';
```

**3. Внутрипакетные глубокие (≥3 уровня - subpath imports):**
```typescript
import { MCP_TOOL_PREFIX } from '#constants';
import { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import { createFixture } from '#helpers/queue.fixture.js';
```

### Миграция с TypeScript Path Aliases

**Было (TypeScript paths):**
```json
{
  "compilerOptions": {
    "paths": {
      "@tracker_api/*": ["./src/tracker_api/*"],
      "@tools/*": ["./src/tools/*"]
    }
  }
}
```

**Стало (Node.js subpath imports):**
```json
{
  "imports": {
    "#tracker_api/*": "./src/tracker_api/*",
    "#tools/*": "./src/tools/*"
  }
}
```

**Детали миграции:** См. `.agentic-planning/plan_migrate_to_subpath_imports/`

---

## 🔄 Data Flow (Yandex Tracker Server)

**Request Chain:** Claude Desktop (JSON-RPC/stdio) → MCP Server (`tools/call`) → ToolRegistry →
Tool (validate params, Zod) → YandexTrackerFacade → Operation (business logic) → HttpClient
(with retry) → Yandex.Tracker API v3 → `*WithUnknownFields` (preserves unknown fields) →
ResponseFieldFilter → Tool returns result.

**Layer Responsibilities:**
- **Tools** — validation, formatting for Claude
- **Facade** — high-level API for tools
- **Operations** — business logic
- **Infrastructure** — HTTP, retry, cache, logging

### Batch Operations Flow

All read and write operations support batch mode for working with multiple issues efficiently.

**GET operations (parallel data fetching):**
```
Tool (issueIds[]) → Operation.executeMany()
  → ParallelExecutor (respects maxConcurrentRequests from ServerConfig)
    → N × API calls (parallel, with throttling)
  → BatchResult<string, Data>
  → BatchResultProcessor.process()
    → Unified format: { total, successful, failed, fieldsReturned }
```

**POST/DELETE operations (parallel modification):**
```
Tool (items[]) → Operation.executeMany()
  → ParallelExecutor (throttles to maxConcurrentRequests)
    → N × API calls (each with individual params)
  → BatchResult<string, Response>
  → BatchResultProcessor.process()
    → Unified format: { total, successful, failed }
```

**Key components:**
- **ParallelExecutor** — enforces maxConcurrentRequests from ServerConfig
- **BatchResultProcessor** — unifies result processing for all batch operations
- **Unified Batch Format** — consistent response structure across all operations

**Two patterns:**
1. **GET batch (shared parameters):** Single set of parameters (perPage, expand) applied to all issues
   - Schema: `issueIds: IssueKeysSchema` (array, min 1)
2. **POST/DELETE batch (individual parameters):** Each issue has its own parameters
   - Schema: array of objects `[{ issueId, ...params }]`

**Examples:** get-comments.tool.ts, add-comment.tool.ts, delete-link.tool.ts

---

## 🔄 Schema-to-Definition Generator

**Problem:**
Manual creation of MCP definitions leads to schema-definition mismatch bugs.

**Solution:**
Automatic generation of MCP definition from Zod schema.

### Architecture

```
Zod Schema (*.schema.ts)
    ↓
generateDefinitionFromSchema()
    ↓
MCP Definition (runtime)
```

### Implementation

**Tool class:**
```typescript
export class GetIssuesTool extends BaseTool<typeof GetIssuesSchema> {
  getDefinition(): ToolDefinition {
    return generateDefinitionFromSchema(this.metadata, GetIssuesSchema);
  }
}
```

**Generator (`@fractalizer/mcp-core`):**
- Uses Zod v4 native `toJSONSchema()` API
- Converts JSON Schema to MCP Definition format
- Extracts descriptions from `.describe()` calls
- Validates required vs optional fields

### Benefits

- ✅ **DRY Principle** — single source of truth (schema)
- ✅ **No Mismatch** — physically impossible to create inconsistency
- ✅ **Simpler Tools** — no separate `*.definition.ts` files
- ✅ **Auto-sync** — schema changes automatically reflected in definition

### Migration

**Old:** Separate `*.schema.ts` + `*.definition.ts` files (removed)
**New:** Only `*.schema.ts` with `generateDefinitionFromSchema()`

**Details:** `.agentic-planning/plan_prevent_schema_definition_mismatch_bugs/`

---

## 📦 Entities & DTO: Forward Compatibility

**Pattern:** Separate types by data flow direction

### Incoming (from API): *WithUnknownFields

```typescript
// packages/servers/yandex-tracker/src/tracker_api/entities/issue.entity.ts
export interface Issue { /* known fields */ }
export type IssueWithUnknownFields = WithUnknownFields<Issue>;
```

**Purpose:** Preserve unknown fields added by Yandex.Tracker

### Outgoing (to API): Strict DTO

```typescript
// packages/servers/yandex-tracker/src/tracker_api/dto/issue/update-issue.dto.ts
export interface UpdateIssueDto {
  summary?: string;
  description?: string;
  // NO index signature (type-safe)
}
```

**Purpose:** Type-safe requests

**Details:** [packages/servers/yandex-tracker/src/tracker_api/entities/README.md](packages/servers/yandex-tracker/src/tracker_api/entities/README.md), [packages/servers/yandex-tracker/src/tracker_api/dto/README.md](packages/servers/yandex-tracker/src/tracker_api/dto/README.md)

---

## 🚀 Batch Operations (Yandex Tracker)

**Principle:** All collection operations use batch approach

**Pattern:**
- `getIssues(keys[])` — batch get
- `createIssues(requests[])` — batch create
- `updateIssues(items[])` — batch update

**Why:**
- Universality (1 or N items)
- Automatic throttling (ParallelExecutor)
- Simplified architecture (no code duplication)

**Implementation:**
```typescript
// ParallelExecutor with 2 independent limits
const executor = new ParallelExecutor(config);
const results = await executor.execute(
  keys,
  (key) => httpClient.get<Issue>(`/v3/issues/${key}`)
);
// results: BatchResult<string, Issue>
```

**Limits:**
1. **MAX_BATCH_SIZE** (business): 200 items per chunk
2. **MAX_CONCURRENT_REQUESTS** (technical): 5 concurrent requests

**Result Type:** `BatchResult<T>` (discriminated union: fulfilled | rejected)

**Details:** [packages/framework/infrastructure/README.md](packages/framework/infrastructure/README.md#parallel-execution)

---

## 🔧 Dependency Injection (Yandex Tracker)

**Approach:** InversifyJS v7 with Symbol-based tokens

**Structure:**
```
packages/servers/yandex-tracker/src/composition-root/
├── types.ts           # Symbol tokens (TYPES.HttpClient, etc.)
├── container.ts       # Container configuration
└── definitions/       # Declarative definitions
    ├── tool-definitions.ts
    └── operation-definitions.ts
```

**Benefits:**
- Works with interfaces
- Easy testing (rebind)
- Explicit contracts

**Details:** [packages/servers/yandex-tracker/src/composition-root/README.md](packages/servers/yandex-tracker/src/composition-root/README.md)

---

## 🔍 Tool Registry & Discovery

**Принцип:** `tools/list` всегда отдаёт полный набор инструментов, прошедший access policy
(см. раздел Architecture Validation ниже) — progressive disclosure на стороне сервера не
реализуется, клиент (Claude Code, Claude Desktop, Codex) решает эту задачу сам.

**Единственный рубильник состава:** `DISABLED_TOOL_GROUPS` (env, по умолчанию пустой — ничего
не отключено). Отключённая группа не только скрывается из `tools/list`, но и не вызывается через
`tools/call` — та же policy, что применяется к списку. Неизвестное имя группы — предупреждение
в stderr с перечнем допустимых значений, не молчание и не падение.

**Устаревшие переменные:** env-переменные прежнего режима discovery удалены целиком (не оставлены
no-op). Если в конфиге клиента такая переменная всё ещё выставлена, сервер печатает предупреждение
в stderr при старте и продолжает работу с полным набором инструментов.

**Детерминированный порядок:** сортировка `tools/list` — контракт, а не побочный эффект: приоритет
как первый ключ, имя как обязательный tie-breaker. При неизменном наборе инструментов два
последовательных вызова `tools/list` дают побайтово одинаковый список (важно для client-side и
prompt-кэша модели).

---

## 🔒 Architecture Validation (dependency-cruiser)

**Rules:**

1. **Layered Architecture**
   - `yandex-tracker` не импортирует в framework пакеты
   - `infrastructure` не импортирует domain слои

2. **Package Boundaries**
   - Импорты между пакетами только через npm package names
   - Нет относительных путов между пакетами

3. **MCP Isolation (yandex-tracker)**
   - Tools используют только Facade, не Operations напрямую
   - Разрешены импорты entities/dto для типов

4. **No Circular Dependencies**
   - Запрещены циклические зависимости

**Validation:**
```bash
npm run depcruise           # Check all rules
npm run depcruise:graph     # Generate dependency graph
```

**Config:** `.dependency-cruiser.cjs`

**Integration:** Rules checked in `npm run validate`

---

## 🧪 Testing Strategy

### Unit Tests

**Structure:** `packages/*/tests/` mirrors `packages/*/src/`

**Framework:** Vitest (ESM + TypeScript)

**Coverage:** ≥80% for all packages

**Patterns:**
- AAA (Arrange, Act, Assert)
- Mocks for external dependencies
- Test both happy path and error cases

**Commands:**
```bash
npm run test                    # All packages
npm run test:coverage           # With coverage
npm run test --workspace=@fractalizer/mcp-core  # Single package
```

**Details:** [packages/servers/yandex-tracker/tests/README.md](packages/servers/yandex-tracker/tests/README.md)

---

## 📋 Adding New Functionality

### Adding Framework Package

1. Create `packages/new-package/`
2. Add `package.json` with correct dependencies
3. Add `tsconfig.json` with project references
4. Update root `package.json` workspaces
5. Update root `tsconfig.json` references
6. Update `.dependency-cruiser.cjs` rules
7. Create README.md
8. `npm install && npm run build`

### Adding MCP Tool (in yandex-tracker)

1. Create structure:
   ```
   packages/servers/yandex-tracker/src/tools/{api|helpers}/{feature}/{action}/
   ├── {name}.schema.ts
   ├── {name}.metadata.ts
   ├── {name}.tool.ts
   └── index.ts
   ```
   (`getDefinition()` uses `generateDefinitionFromSchema()` — no separate `*.definition.ts` file)

2. Add to registry:
   ```typescript
   // packages/servers/yandex-tracker/src/composition-root/definitions/tool-definitions.ts
   export const TOOL_CLASSES = [
     // ...
     NewTool,
   ] as const;
   ```

3. Tests + `npm run validate`

**Details:** [packages/servers/yandex-tracker/src/tools/README.md](packages/servers/yandex-tracker/src/tools/README.md)

### Adding API Operation (in yandex-tracker)

1. Create `packages/servers/yandex-tracker/src/tracker_api/api_operations/{feature}/{action}/{name}.operation.ts`
2. Extend `BaseOperation`
3. Add facade method
4. Register in `packages/servers/yandex-tracker/src/composition-root/definitions/operation-definitions.ts`
5. Tests + `npm run validate`

**Details:** [packages/servers/yandex-tracker/src/tracker_api/api_operations/README.md](packages/servers/yandex-tracker/src/tracker_api/api_operations/README.md)

---

## 🚀 Build & Release Process

### Build Order (Topological)

```bash
npm run build
# Builds in order:
# 1. infrastructure
# 2. core (depends on infrastructure)
# 3. yandex-tracker (depends on all)
```

### Version Management

**Tool:** Changesets (https://github.com/changesets/changesets)

**Workflow:**
1. `npx changeset add` — describe changes
2. `npx changeset version` — bump versions
3. `git commit && git push`
4. GitHub Actions publishes to npm

**Manual publish:**
```bash
npm run publish:all
```

---

## 🔍 Code Quality Tools

### Linting & Formatting
- **ESLint** — code quality (max-params, complexity)
- **Prettier** — code formatting (via pre-commit hook)
- **TypeScript** — type checking (strict mode)

### Security
- **Socket.dev** — supply-chain analysis
- **Gitleaks** — secret scanning (pre-commit hook)

### Dead Code Detection
- **Knip** — unused files/exports/dependencies

### Lockfile Validation
- Ensures package-lock.json is in sync

**Run all:**
```bash
npm run validate
```

---

## 📚 Documentation Structure

### Monorepo Root

- **[README.md](README.md)** — Overview, quick start
- **[CLAUDE.md](CLAUDE.md)** — Monorepo rules for AI agents
- **[ARCHITECTURE.md](ARCHITECTURE.md)** (this file) — Architecture overview

### Framework Packages

- **[packages/framework/infrastructure/README.md](packages/framework/infrastructure/README.md)** — Infrastructure API
- **[packages/framework/core/README.md](packages/framework/core/README.md)** — Core API

### Yandex Tracker

- **[packages/servers/yandex-tracker/README.md](packages/servers/yandex-tracker/README.md)** — User guide
- **[packages/servers/yandex-tracker/CLAUDE.md](packages/servers/yandex-tracker/CLAUDE.md)** — Developer rules
- **Module READMEs:**
  - [src/tools/README.md](packages/servers/yandex-tracker/src/tools/README.md)
  - [src/tracker_api/api_operations/README.md](packages/servers/yandex-tracker/src/tracker_api/api_operations/README.md)
  - [src/tracker_api/entities/README.md](packages/servers/yandex-tracker/src/tracker_api/entities/README.md)
  - [src/tracker_api/dto/README.md](packages/servers/yandex-tracker/src/tracker_api/dto/README.md)
  - [src/composition-root/README.md](packages/servers/yandex-tracker/src/composition-root/README.md)
  - [tests/README.md](packages/servers/yandex-tracker/tests/README.md)

---

## 🎯 Design Patterns Used

### Framework Level
- **Strategy Pattern** — retry strategies
- **Null Object** — NoOpCache
- **Factory Pattern** — Tool creation in registry
- **Template Method** — BaseTool, BaseDefinition

### Application Level (Yandex Tracker)
- **Facade Pattern** — YandexTrackerFacade
- **Registry Pattern** — ToolRegistry
- **Dependency Injection** — InversifyJS container
- **Repository Pattern** — Operations as repositories

---

## 📊 Performance Considerations

### Compile-time Optimization
- TypeScript compilation with project references
- Incremental builds

### Runtime Optimization
- Lazy tool initialization (ToolRegistry creates tools on-demand via DI)
- Batch operations (parallel execution)
- Field filtering (80-90% response size reduction)

### Bundle Size
- Tree-shaking friendly (ESM modules)
- Separate packages (install only what you need)
- No dynamic requires

---

## 🔗 External Resources

- **MCP Specification:** https://github.com/anthropics/mcp
- **Yandex.Tracker API:** https://cloud.yandex.ru/docs/tracker/about-api
- **InversifyJS:** https://inversify.io/
- **Zod:** https://zod.dev/
- **Vitest:** https://vitest.dev/
- **dependency-cruiser:** https://github.com/sverweij/dependency-cruiser
