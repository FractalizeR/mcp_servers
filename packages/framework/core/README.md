# @fractalizer/mcp-core

**Core framework for building MCP tools: base classes, utilities, registry**

[![npm version](https://img.shields.io/npm/v/@fractalizer/mcp-core.svg)](https://www.npmjs.com/package/@fractalizer/mcp-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🎯 Purpose

**Principle:** Core provides reusable base classes and utilities for building MCP tools

**Generic Design:** `BaseTool<TFacade>` is facade-agnostic — works with any API facade

**Architecture rule:** Core depends ONLY on `@fractalizer/mcp-infrastructure`

---

## ⚠️ Scope Restrictions

Этот пакет содержит **ТОЛЬКО** инфраструктуру для MCP tools:

| ✅ Входит в scope | ❌ НЕ входит в scope |
|-------------------|---------------------|
| `BaseTool` и связанные типы | HTTP клиенты → `@fractalizer/mcp-infrastructure` |
| `ToolRegistry` и фильтрация | CLI логика → `@fractalizer/mcp-cli` |
| Schema → Definition генерация | Поиск tools → `@fractalizer/mcp-search` |
| Утилиты для результатов tools | Бизнес-логика серверов → `packages/servers/*` |
| Общие Zod-схемы для tools | Logging, caching → `@fractalizer/mcp-infrastructure` |

**Правило:** Если функционал не связан напрямую с созданием/регистрацией/выполнением MCP tools — ему здесь не место

---

## 📦 Installation

```bash
npm install @fractalizer/mcp-core
```

**Dependencies:**
- `@fractalizer/mcp-infrastructure` (HTTP, logging, config)
- `@modelcontextprotocol/sdk` (MCP protocol)
- `zod` (validation)

---

## 📁 Structure

```
src/
├── definition/                       # Schema-to-Definition generation
│   ├── schema-to-definition.ts      # Auto-generate definitions from Zod
│   ├── definition-validator.ts      # ToolDefinition validation
│   └── zod-json-schema-adapter.ts   # Zod → JSON Schema converter
├── tool-registry/                    # Tool registration and filtering
│   ├── tool-registry.ts             # Tool registration and routing
│   ├── tool-filter.service.ts       # Category/subcategory filtering
│   ├── tool-sorter.ts               # Priority-based sorting
│   └── types.ts                     # Registry types
├── tools/
│   ├── base/                         # Base classes for tools
│   │   ├── base-tool.ts             # Generic BaseTool<TSchema>
│   │   └── tool-metadata.ts         # StaticToolMetadata interface
│   └── common/                       # Common utilities
│       ├── schemas/                 # Reusable Zod schemas
│       └── utils/                   # Tool utilities
├── utils/                            # General utilities
│   ├── response-field-filter.ts     # Filter response fields
│   ├── batch-result-processor.ts    # Process batch results
│   └── result-logger.ts             # Log tool results
└── index.ts                          # Public exports
```

---

## 🔧 Core Components

### BaseTool<TFacade>

**Generic base class** for creating MCP tools that work with any API facade.

**Key features:**
- ✅ Generic `<TFacade>` — facade-agnostic design
- ✅ Automatic parameter validation (Zod schemas via `getParamsSchema()`)
- ✅ Auto-generates MCP definitions from schema (DRY principle)
- ✅ Built-in logging, error handling
- ✅ Integration with ToolRegistry

**Implementation:** [src/tools/base/base-tool.ts](src/tools/base/base-tool.ts)

**Abstract interface:**
```typescript
abstract class BaseTool<TFacade = unknown> {
  static readonly METADATA: StaticToolMetadata; // Required!

  constructor(facade: TFacade, logger: Logger);

  getDefinition(): ToolDefinition;  // Auto-generated from schema
  getParamsSchema?(): ZodSchema;    // Optional: enables auto-generation
  abstract execute(params: unknown): Promise<ToolResult>;
}
```

**Reference implementation:** See any tool in `packages/servers/yandex-tracker/src/tools/api/` (e.g., `issues/get/get-issues.tool.ts`)

### generateDefinitionFromSchema()

**✅ Auto-generates MCP definitions from Zod schemas** (eliminates schema-definition mismatch)

**Key features:**
- ✅ Single source of truth (Zod schema with `.describe()`)
- ✅ Uses Zod v4 native `schema.toJSONSchema()` API
- ✅ Automatic required/optional field detection
- ✅ Physically impossible to create schema ↔ definition mismatch

**Implementation:** [src/definition/schema-to-definition.ts](src/definition/schema-to-definition.ts)

**Function signature:**
```typescript
function generateDefinitionFromSchema(
  schema: ZodSchema,
  options?: { includeDescriptions?: boolean }
): JSONSchema7
```

**Benefits:** DRY principle, type-safe, no separate `*.definition.ts` files

**Migration guide:** [../../ARCHITECTURE.md](../../ARCHITECTURE.md) → "Schema-to-Definition Generator"

---

### BaseDefinition (Deprecated)

**⚠️ Deprecated** in v2.0 — use `generateDefinitionFromSchema()` instead.

**Problem with old approach:** Manual sync between Zod validation schema and MCP definition → frequent mismatch bugs.

---

### ToolRegistry

**Tool registration and routing** — maps tool names to handlers, provides filtering and sorting.

**Key features:**
- ✅ Lazy initialization (tools created on-demand via DI container)
- ✅ **Priority-based sorting:** critical → high → normal → low
- ✅ **Category filtering** (via `ToolFilterService`)
- ✅ Type-safe tool registration
- ✅ Error handling for unknown tools

**Implementation:** [src/tool-registry/tool-registry.ts](src/tool-registry/tool-registry.ts)

**Class signature:**
```typescript
class ToolRegistry {
  constructor(
    container: Container,
    logger: Logger,
    toolClasses: ReadonlyArray<ToolClass>,
    filterService?: ToolFilterService
  );

  getDefinitions(): ToolDefinition[];  // Filtered & sorted
  executeToolByName(name: string, params: ToolCallParams): Promise<ToolResult>;
}
```

---

## 🛠️ Utilities

### ResponseFieldFilter

**Filter response fields** to reduce token usage (80-90% savings).

**Usage:**
```typescript
import { ResponseFieldFilter } from '@fractalizer/mcp-core';

const data = {
  id: '123',
  name: 'Item',
  description: 'Long description...',
  metadata: { /* ... */ },
};

// Filter to specific fields
const filtered = ResponseFieldFilter.filter(data, ['id', 'name']);
// Result: { id: '123', name: 'Item' }

// No fields specified = return all
const all = ResponseFieldFilter.filter(data);
// Result: full data object
```

### BatchResultProcessor

**Process batch operation results** (fulfilled + rejected).

**Usage:**
```typescript
import { BatchResultProcessor } from '@fractalizer/mcp-core';

const results: BatchResult<string, Item> = [
  { status: 'fulfilled', value: { id: '1', name: 'Item 1' } },
  { status: 'rejected', reason: new Error('Not found') },
];

// Separate successful and failed
const { successful, failed } = BatchResultProcessor.separateResults(results);

// Format for response
const formatted = BatchResultProcessor.formatBatchResponse(
  successful,
  failed,
  'items'
);
// Result: { items: [...], errors: [...] }
```

### ResultLogger

**Log tool execution results** with structured output.

**Usage:**
```typescript
import { ResultLogger } from '@fractalizer/mcp-core';

// Log successful result
ResultLogger.logSuccess(logger, 'get_item', result, { itemId: '123' });

// Log error
ResultLogger.logError(logger, 'get_item', error, { itemId: '123' });
```

---

## 🚨 Critical Rules

### 1. BaseTool is generic — facade-agnostic

```typescript
// ✅ CORRECT (generic facade)
class MyTool extends BaseTool<MyApiFacade> {
  async execute(params: Params) {
    // Use this.facade (type: MyApiFacade)
    return this.facade.someMethod();
  }
}

// ❌ WRONG (hardcoded facade type in BaseTool)
class BaseTool {
  constructor(private facade: SpecificFacade) {} // BAD!
}
```

### 2. Always validate params with Zod

```typescript
// ✅ CORRECT
const validated = this.validateParams(ParamsSchema, params);

// ❌ WRONG (no validation)
const id = params.id; // Unsafe!
```

### 3. Use METADATA for tool discovery

```typescript
// ✅ CORRECT — Extended metadata with categorization
static readonly METADATA: ToolMetadata = {
  name: 'my_tool',
  description: '[Category/Action] Brief description',
  category: 'api',              // REQUIRED
  subcategory: 'read',          // Optional (read/write/workflow)
  priority: 'critical',         // Optional (critical/high/normal/low)
  tags: ['tag1', 'tag2'],       // Optional (for search)
  requiresExplicitUserConsent: false, // or true for write operations
  inputSchema: {...}
};

// ❌ WRONG (missing required category)
static readonly METADATA = {
  name: 'my_tool',
  description: 'Tool description',
  // Missing category — will fail type check
};
```

**Tool Categorization & Priority:**

**Priority levels** (for sorting in tools/list):
- `critical` — Frequently used, key operations (shown first)
- `high` — Important but not critical
- `normal` — Regular operations (default)
- `low` — Rarely used, debug tools (shown last)

**Tools are sorted:** critical → high → normal → low → alphabetically

**Description convention:** `[Category/Subcategory] Brief description`
- Keep descriptions concise (≤80 chars)
- Use category prefix for structure
- Details go in inputSchema parameter descriptions

**Example:**
```typescript
static readonly METADATA: ToolMetadata = {
  name: 'create_issue',
  description: '[Issues/Write] Create new issue',
  category: 'issues',
  subcategory: 'write',
  priority: 'critical',
  tags: ['create', 'new', 'write', 'issue'],
  inputSchema: {...}
};
```

### 4. Filter fields before returning

```typescript
// ✅ CORRECT (filter to save tokens)
const filtered = ResponseFieldFilter.filter(data, params.fields);
return { content: [{ type: 'text', text: JSON.stringify(filtered) }] };

// ❌ WRONG (return everything)
return { content: [{ type: 'text', text: JSON.stringify(data) }] };
```

---

## 📖 API Reference

### Exports

```typescript
// Base classes
export { BaseTool } from './tools/base/base-tool.js';
export { BaseDefinition } from './tools/base/base-definition.js';
export type { StaticToolMetadata } from './tools/base/tool-metadata.js';

// Utilities
export { ResponseFieldFilter } from './utils/response-field-filter.js';
export { BatchResultProcessor } from './utils/batch-result-processor.js';
export { ResultLogger } from './utils/result-logger.js';

// Registry
export { ToolRegistry } from './tool-registry.js';

// Common utilities
export { buildToolName, SafetyWarningBuilder } from './tools/common/utils/index.js';

// Types
export type { BatchResult, FulfilledResult, RejectedResult } from '@fractalizer/mcp-infrastructure';
```

---

## 🧪 Testing

**Run tests:**
```bash
cd packages/framework/core
npm run test
```

**With coverage:**
```bash
npm run test:coverage
```

**Watch mode:**
```bash
npm run test:watch
```

---

## 🤝 Contributing

See [../../.github/CONTRIBUTING.md](../../.github/CONTRIBUTING.md)

**Architecture rules:** [../../CLAUDE.md](../../CLAUDE.md)

---

## 📄 License

MIT License

---

## 🔗 Links

- **Monorepo root:** [../../README.md](../../README.md)
- **Architecture:** [../../ARCHITECTURE.md](../../ARCHITECTURE.md)
- **Infrastructure package:** [../infrastructure/README.md](../infrastructure/README.md)
