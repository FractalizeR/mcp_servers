# @mcp-framework/core

**Core framework for building MCP tools: base classes, utilities, registry**

[![npm version](https://img.shields.io/npm/v/@mcp-framework/core.svg)](https://www.npmjs.com/package/@mcp-framework/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🎯 Purpose

**Principle:** Core provides reusable base classes and utilities for building MCP tools

**Generic Design:** `BaseTool<TFacade>` is facade-agnostic — works with any API facade

**Architecture rule:** Core depends ONLY on `@mcp-framework/infrastructure`

---

## 📦 Installation

```bash
npm install @mcp-framework/core
```

**Dependencies:**
- `@mcp-framework/infrastructure` (HTTP, logging, config)
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
- ✅ Automatic parameter validation (Zod schemas)
- ✅ Built-in logging with structured output
- ✅ Error handling with detailed context
- ✅ Integration with ToolRegistry

**Usage:**
```typescript
import { BaseTool } from '@mcp-framework/core';
import { z } from 'zod';

// Define your facade interface
interface MyApiFacade {
  getItem(id: string): Promise<Item>;
}

// Define parameter schema
const ParamsSchema = z.object({
  id: z.string(),
});

type Params = z.infer<typeof ParamsSchema>;

// Create your tool
class GetItemTool extends BaseTool<MyApiFacade> {
  static readonly METADATA = {
    name: 'get_item',
    category: 'api',
    description: 'Get item by ID',
    requiresExplicitUserConsent: false,
  };

  async execute(params: Params): Promise<Item> {
    // Validate params
    const validated = this.validateParams(ParamsSchema, params);

    // Use facade
    const item = await this.facade.getItem(validated.id);

    return item;
  }
}
```

### generateDefinitionFromSchema()

**✅ NEW: Auto-generate MCP definitions from Zod schemas**

**Purpose:** Eliminates schema-definition mismatch by generating MCP ToolDefinition directly from Zod schema.

**Key features:**
- ✅ Single source of truth (Zod schema)
- ✅ Physically impossible to create schema-definition mismatch
- ✅ Uses Zod v4 native `toJSONSchema()` API
- ✅ Extracts descriptions from `.describe()` calls
- ✅ Automatic required/optional field detection

**Usage:**
```typescript
import { BaseTool, generateDefinitionFromSchema } from '@mcp-framework/core';
import { z } from 'zod';

// Define schema with descriptions
const GetItemSchema = z.object({
  id: z.string().describe('Item ID to retrieve'),
  fields: z.array(z.string()).optional().describe('Fields to include'),
});

// Tool uses auto-generation
class GetItemTool extends BaseTool<MyApiFacade> {
  static readonly METADATA = {
    name: 'get_item',
    description: '[API] Get item by ID',
  };

  getDefinition() {
    return generateDefinitionFromSchema(
      GetItemTool.METADATA,
      GetItemSchema
    );
  }
}
```

**Benefits:**
- DRY principle — no duplicate schema definitions
- Type-safe — schema and definition always match
- Simpler tools — no separate `*.definition.ts` files
- Auto-sync — changes to schema instantly reflected in definition

**Migration:** See `../../ARCHITECTURE.md#schema-to-definition-generator`

---

### BaseDefinition (Deprecated)

**⚠️ Deprecated:** Use `generateDefinitionFromSchema()` instead.

**Old approach** (manual definition):
```typescript
class GetItemDefinition extends BaseDefinition {
  build() {
    return {
      name: GetItemTool.METADATA.name,
      description: this.buildDescription(),
      inputSchema: { /* manual JSON schema */ },
    };
  }
}
```

**Problem:** Manual sync between Zod schema and MCP definition → mismatch bugs

---

### ToolRegistry

**Tool registration and routing** — maps tool names to handlers.

**Key features:**
- ✅ Lazy initialization (tools created on-demand)
- ✅ Type-safe tool registration
- ✅ **Priority-based sorting** (critical → high → normal → low)
- ✅ Automatic name mapping
- ✅ Error handling for unknown tools

**Priority-based sorting:**

ToolRegistry automatically sorts tools by priority when returning definitions:
1. **critical** — shown first (frequently used operations)
2. **high** — important operations
3. **normal** — regular operations (default)
4. **low** — shown last (debug, demo tools)

Within same priority, tools are sorted alphabetically by name.

**Usage:**
```typescript
import { ToolRegistry } from '@mcp-framework/core';

const registry = new ToolRegistry(container, logger, toolClasses);

// Get sorted tool definitions (by priority)
const definitions = registry.getDefinitions();
// Returns: [critical tools...] → [high tools...] → [normal tools...] → [low tools...]

// Execute tool
const result = await registry.executeTool('get_item', { id: '123' });
```

---

## 🛠️ Utilities

### ResponseFieldFilter

**Filter response fields** to reduce token usage (80-90% savings).

**Usage:**
```typescript
import { ResponseFieldFilter } from '@mcp-framework/core';

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
import { BatchResultProcessor } from '@mcp-framework/core';

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
import { ResultLogger } from '@mcp-framework/core';

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
export type { BatchResult, FulfilledResult, RejectedResult } from '@mcp-framework/infrastructure';
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
- **Changelog:** [CHANGELOG.md](CHANGELOG.md)
