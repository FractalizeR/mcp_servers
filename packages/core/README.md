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
├── tools/
│   ├── base/                         # Base classes for tools
│   │   ├── base-tool.ts             # Generic BaseTool<TFacade>
│   │   ├── base-definition.ts       # BaseDefinition abstract class
│   │   └── tool-metadata.ts         # StaticToolMetadata interface
│   └── common/                       # Common utilities
│       └── utils/                    # Tool utilities
│           ├── tool-name.ts         # Tool naming conventions
│           └── safety-warning-builder.ts
├── utils/                            # General utilities
│   ├── response-field-filter.ts     # Filter response fields
│   ├── batch-result-processor.ts    # Process batch results
│   └── result-logger.ts             # Log tool results
├── tool-registry.ts                  # Tool registration and routing
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

### BaseDefinition

**Abstract class** for creating MCP tool definitions (schema + description).

**Usage:**
```typescript
import { BaseDefinition } from '@mcp-framework/core';

class GetItemDefinition extends BaseDefinition {
  build() {
    return {
      name: GetItemTool.METADATA.name,
      description: this.wrapWithSafetyWarning(
        this.buildDescription()
      ),
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Item ID' },
        },
        required: ['id'],
      },
    };
  }

  protected buildDescription(): string {
    return 'Retrieve item details by ID';
  }

  protected getStaticMetadata() {
    return GetItemTool.METADATA;
  }
}
```

### ToolRegistry

**Tool registration and routing** — maps tool names to handlers.

**Key features:**
- ✅ Lazy initialization (tools created on-demand)
- ✅ Type-safe tool registration
- ✅ Automatic name mapping
- ✅ Error handling for unknown tools

**Usage:**
```typescript
import { ToolRegistry } from '@mcp-framework/core';

const registry = new ToolRegistry(logger);

// Register tools
registry.registerTool('get_item', (facade) => new GetItemTool(facade, logger));

// List all tools
const tools = registry.listTools();

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
// ✅ CORRECT
static readonly METADATA: StaticToolMetadata = {
  name: 'my_tool',
  category: 'api',
  description: 'Tool description',
  requiresExplicitUserConsent: false, // or true for write operations
};

// ❌ WRONG (no metadata)
class MyTool extends BaseTool<TFacade> {
  // No METADATA — tool won't be discoverable
}
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
cd packages/core
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
