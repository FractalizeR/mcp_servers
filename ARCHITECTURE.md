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
├── infrastructure/     → @mcp-framework/infrastructure
│   ├── http/, cache/, async/, logging/
│   └── 0 dependencies
├── core/              → @mcp-framework/core
│   ├── tools/base/, utils/, tool-registry
│   └── depends on: infrastructure
├── search/            → @mcp-framework/search
│   ├── engine/, strategies/, tools/
│   └── depends on: core
└── yandex-tracker/    → mcp-server-yandex-tracker
    ├── api_operations/, entities/, mcp/, composition-root/
    └── depends on: infrastructure, core, search
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
│     search      │ ← Tool discovery (search engine, strategies)
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

### @mcp-framework/infrastructure

**Purpose:** Reusable infrastructure layer (domain-agnostic)

**Components:**
- **HTTP Layer:** HttpClient (Axios wrapper), RetryHandler, ErrorMapper
- **Caching:** CacheManager interface, NoOpCache
- **Async:** ParallelExecutor (batch throttling)
- **Logging:** Pino with rotating-file-stream
- **Config:** Environment variable loading and validation

**Key Principle:** Infrastructure does NOT know about domain (Yandex.Tracker, MCP)

**Details:** [packages/infrastructure/README.md](packages/infrastructure/README.md)

### @mcp-framework/core

**Purpose:** Core framework for building MCP tools

**Components:**
- **Base Classes:** BaseTool<TFacade>, BaseDefinition
- **Tool Registry:** ToolRegistry (lazy initialization)
- **Utilities:** ResponseFieldFilter, BatchResultProcessor, ResultLogger
- **Schemas:** Common Zod schemas (fields, expand, issue-key)

**Key Principle:** Generic `BaseTool<TFacade>` — facade-agnostic design

**Details:** [packages/core/README.md](packages/core/README.md)

### @mcp-framework/search

**Purpose:** Advanced tool discovery with compile-time indexing

**Components:**
- **Engine:** ToolSearchEngine (LRU cache)
- **Strategies:** Name, Description, Category, Fuzzy, WeightedCombined
- **Tools:** SearchToolsTool (MCP tool for Claude)
- **Index:** generated-index.ts (auto-generated at build)

**Key Principle:** Compile-time indexing (zero runtime overhead)

**Details:** [packages/search/README.md](packages/search/README.md)

### mcp-server-yandex-tracker

**Purpose:** Complete MCP server for Yandex.Tracker API v3

**Components:**
- **API Operations:** Batch operations for issues, users, comments
- **Entities:** Domain types (Issue, User, Queue, etc.)
- **DTO:** Data Transfer Objects (create, update requests)
- **MCP Tools:** API tools + helpers
- **DI:** InversifyJS composition root

**Key Principle:** Built on framework packages (infrastructure, core, search)

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

## 🔄 Data Flow (Yandex Tracker Server)

**Request Chain:**

```
1. Claude Desktop (MCP Client)
   ↓ JSON-RPC via stdio
2. MCP Server (index.ts)
   ↓ tools/call
3. ToolRegistry
   ↓ route to tool
4. Concrete Tool (e.g., GetIssuesTool)
   ↓ validate params (Zod)
5. YandexTrackerFacade
   ↓ delegate to operation
6. Operation (e.g., GetIssuesOperation)
   ↓ business logic
7. HttpClient (with retry)
   ↓ HTTPS request
8. Yandex.Tracker API v3
   ↓ response
9. IssueWithUnknownFields (preserves unknown fields)
   ↓ filter fields
10. ResponseFieldFilter
   ↓ format for Claude
11. Tool returns result
```

**Layer Responsibilities:**
- **Tools** — validation, formatting for Claude
- **Facade** — high-level API for tools
- **Operations** — business logic
- **Infrastructure** — HTTP, retry, cache, logging

---

## 📦 Entities & DTO: Forward Compatibility

**Pattern:** Separate types by data flow direction

### Incoming (from API): *WithUnknownFields

```typescript
// packages/servers/yandex-tracker/src/entities/issue.entity.ts
export interface Issue { /* known fields */ }
export type IssueWithUnknownFields = WithUnknownFields<Issue>;
```

**Purpose:** Preserve unknown fields added by Yandex.Tracker

### Outgoing (to API): Strict DTO

```typescript
// packages/servers/yandex-tracker/src/dto/issue/update-issue.dto.ts
export interface UpdateIssueDto {
  summary?: string;
  description?: string;
  // NO index signature (type-safe)
}
```

**Purpose:** Type-safe requests

**Details:** [packages/servers/yandex-tracker/src/entities/README.md](packages/servers/yandex-tracker/src/entities/README.md), [packages/servers/yandex-tracker/src/dto/README.md](packages/servers/yandex-tracker/src/dto/README.md)

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

**Details:** [packages/infrastructure/README.md](packages/infrastructure/README.md#parallel-execution)

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

## 🔍 Tool Search System

**Architecture:**

1. **Compile-time Indexing:**
   ```bash
   npm run build
   # → runs scripts/generate-tool-index.ts
   # → generates packages/search/src/generated-index.ts
   ```

2. **Runtime Search:**
   ```typescript
   const engine = new ToolSearchEngine(TOOL_INDEX);
   const results = engine.search('find issues');
   ```

3. **5 Search Strategies:**
   - NameSearchStrategy (exact/partial match)
   - DescriptionSearchStrategy (word matching)
   - CategorySearchStrategy (category filter)
   - FuzzySearchStrategy (Levenshtein distance)
   - WeightedCombinedStrategy (combine all)

4. **LRU Cache:**
   - Max 100 entries
   - Key: `${query}_${strategy}`

**Details:** [packages/search/README.md](packages/search/README.md)

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
npm run test --workspace=@mcp-framework/core  # Single package
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
   packages/servers/yandex-tracker/src/mcp/tools/{api|helpers}/{feature}/{action}/
   ├── {name}.schema.ts
   ├── {name}.definition.ts
   ├── {name}.tool.ts
   └── index.ts
   ```

2. Add to registry:
   ```typescript
   // packages/servers/yandex-tracker/src/composition-root/definitions/tool-definitions.ts
   export const TOOL_CLASSES = [
     // ...
     NewTool,
   ] as const;
   ```

3. Tests + `npm run validate`

**Details:** [packages/servers/yandex-tracker/src/mcp/README.md](packages/servers/yandex-tracker/src/mcp/README.md)

### Adding API Operation (in yandex-tracker)

1. Create `packages/servers/yandex-tracker/src/api_operations/{feature}/{action}/{name}.operation.ts`
2. Extend `BaseOperation`
3. Add facade method
4. Register in `packages/servers/yandex-tracker/src/composition-root/definitions/operation-definitions.ts`
5. Tests + `npm run validate`

**Details:** [packages/servers/yandex-tracker/src/api_operations/README.md](packages/servers/yandex-tracker/src/api_operations/README.md)

---

## 🚀 Build & Release Process

### Build Order (Topological)

```bash
npm run build
# Builds in order:
# 1. infrastructure
# 2. core (depends on infrastructure)
# 3. search (depends on core)
# 4. yandex-tracker (depends on all)
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
- **[MIGRATION.md](MIGRATION.md)** — Migration guide v1 → v2

### Framework Packages

- **[packages/infrastructure/README.md](packages/infrastructure/README.md)** — Infrastructure API
- **[packages/core/README.md](packages/core/README.md)** — Core API
- **[packages/search/README.md](packages/search/README.md)** — Search system

### Yandex Tracker

- **[packages/servers/yandex-tracker/README.md](packages/servers/yandex-tracker/README.md)** — User guide
- **[packages/servers/yandex-tracker/CLAUDE.md](packages/servers/yandex-tracker/CLAUDE.md)** — Developer rules
- **Module READMEs:**
  - [src/mcp/README.md](packages/servers/yandex-tracker/src/mcp/README.md)
  - [src/api_operations/README.md](packages/servers/yandex-tracker/src/api_operations/README.md)
  - [src/entities/README.md](packages/servers/yandex-tracker/src/entities/README.md)
  - [src/dto/README.md](packages/servers/yandex-tracker/src/dto/README.md)
  - [src/composition-root/README.md](packages/servers/yandex-tracker/src/composition-root/README.md)
  - [tests/README.md](packages/servers/yandex-tracker/tests/README.md)

---

## 🎯 Design Patterns Used

### Framework Level
- **Strategy Pattern** — Search strategies, retry strategies
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
- Tool index generated at build (not runtime)
- TypeScript compilation with project references
- Incremental builds

### Runtime Optimization
- Lazy tool initialization (ToolRegistry)
- LRU cache (tool search)
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
