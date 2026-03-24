# @fractalizer/mcp-search

**Advanced Tool Search Engine with compile-time indexing and 5 search strategies**

[![npm version](https://img.shields.io/npm/v/@fractalizer/mcp-search.svg)](https://www.npmjs.com/package/@fractalizer/mcp-search)
[![License: PolyForm Shield](https://img.shields.io/badge/License-PolyForm%20Shield-blue.svg)](https://polyformproject.org/licenses/shield/1.0.0/)

---

## 🎯 Purpose

**Principle:** Fast, intelligent tool discovery with compile-time indexing

**Key Features:**
- ✅ **Compile-time indexing** — zero runtime overhead for index generation
- ✅ **5 search strategies** — name, description, category, fuzzy, weighted-combined
- ✅ **LRU cache** — fast repeated searches
- ✅ **MCP tool included** — `search_tools` for Claude to discover tools

**Architecture rule:** Search depends ONLY on `@fractalizer/mcp-core`

---

## 📦 Installation

```bash
npm install @fractalizer/mcp-search
```

**Dependencies:**
- `@fractalizer/mcp-core` (BaseTool, utilities)
- `@fractalizer/mcp-infrastructure` (via core)
- `lru-cache` (caching)

---

## 📁 Structure

```
src/
├── engine/
│   └── tool-search-engine.ts        # Main search engine with LRU cache
├── strategies/                       # 5 search strategies
│   ├── search-strategy.interface.ts
│   ├── name-search.strategy.ts      # Match by tool name
│   ├── description-search.strategy.ts # Match in description
│   ├── category-search.strategy.ts  # Match by category
│   ├── fuzzy-search.strategy.ts     # Fuzzy matching
│   └── weighted-combined.strategy.ts # Combine all strategies
├── scoring/
│   └── strategy-weights.ts          # Configurable weights
├── tools/                            # MCP tool for search
│   ├── search-tools.tool.ts
│   ├── search-tools.metadata.ts     # Metadata
│   ├── search-tools.definition.ts
│   └── search-tools.schema.ts
├── utils/                            # Utilities
│   ├── build-index-from-registry.ts # Index builder
│   └── text-utils.ts                # Text processing
├── constants.ts                      # Constants
├── types.ts                          # Type definitions
└── index.ts                          # Public exports
```

---

## 🔧 Core Components

### ToolSearchEngine

**Main search engine** with LRU cache and strategy selection.

**Usage:**
```typescript
import { ToolSearchEngine } from '@fractalizer/mcp-search';

// Create engine with tool metadata
const engine = new ToolSearchEngine(toolMetadataArray);

// Search with default strategy (weighted-combined)
const results = engine.search('find issues');

// Search with specific strategy
const nameResults = engine.search('get_issue', 'name');
const fuzzyResults = engine.search('isue', 'fuzzy');

console.log(results);
// [
//   { tool: ToolMetadata, score: 0.95 },
//   { tool: ToolMetadata, score: 0.78 },
//   ...
// ]
```

**Cache:**
- LRU cache with max 100 entries
- Cache key: `${query}_${strategy}`
- Automatic eviction of least recently used

### Search Strategies

**5 strategies with different matching algorithms:**

#### 1. NameSearchStrategy
Matches query against tool name.

**Example:**
```typescript
Query: "get_issue"
Matches: "get_issue" (exact), "get_issues" (partial)
```

#### 2. DescriptionSearchStrategy
Matches query words in tool description.

**Example:**
```typescript
Query: "retrieve task details"
Matches tools with descriptions containing "retrieve", "task", "details"
```

#### 3. CategorySearchStrategy
Matches query against tool category.

**Example:**
```typescript
Query: "api"
Matches all tools with category: "api"
```

#### 4. FuzzySearchStrategy
Fuzzy matching using Levenshtein distance.

**Example:**
```typescript
Query: "isue" (typo)
Matches: "issue" (distance: 1)
```

#### 5. WeightedCombinedStrategy (Default)
Combines all strategies with configurable weights.

**Default weights:**
```typescript
{
  name: 0.4,        // 40% - name match most important
  description: 0.3, // 30% - description match
  category: 0.2,    // 20% - category match
  fuzzy: 0.1,       // 10% - fuzzy fallback
}
```

**Usage:**
```typescript
import { WeightedCombinedStrategy, STRATEGY_WEIGHTS } from '@fractalizer/mcp-search';

// Custom weights
const customWeights = {
  ...STRATEGY_WEIGHTS,
  fuzzy: 0.2, // Increase fuzzy matching importance
};

const strategy = new WeightedCombinedStrategy(customWeights);
```

---

## 🛠️ Compile-time Indexing

**Automatic index generation at build time:**

1. **prebuild script** (in package.json):
   ```json
   {
     "scripts": {
       "prebuild": "tsx scripts/generate-tool-index.ts"
     }
   }
   ```

2. **Script scans** `TOOL_CLASSES` and extracts `METADATA`:
   ```typescript
   // scripts/generate-tool-index.ts
   const TOOL_CLASSES = [
     GetIssueTool,
     FindIssuesTool,
     // ...
   ];

   // Generates: src/generated-index.ts
   export const TOOL_INDEX = [
     { name: 'get_issue', category: 'api', description: '...' },
     { name: 'find_issues', category: 'api', description: '...' },
   ];
   ```

3. **Search engine** uses pre-generated index (no runtime reflection):
   ```typescript
   import { TOOL_INDEX } from './generated-index.js';

   const engine = new ToolSearchEngine(TOOL_INDEX);
   ```

**Benefits:**
- ⚡ Zero runtime overhead for index generation
- 🔒 Type-safe (compile-time validation)
- 📦 Smaller bundle (no reflection code)

---

## 🔍 MCP Tool: search_tools

**Included MCP tool** for Claude to discover available tools.

**Tool name:** `search_tools`

**Usage in Claude:**
```
User: "What tools are available for working with issues?"
Claude uses: search_tools { query: "issues" }
```

**Parameters:**
```typescript
{
  query: string;           // Search query
  strategy?: string;       // Optional: 'name' | 'description' | 'category' | 'fuzzy' | 'weighted'
  limit?: number;          // Optional: max results (default: 10)
}
```

**Example response:**
```json
{
  "results": [
    {
      "name": "get_issue",
      "category": "api",
      "description": "Retrieve issue details by key",
      "score": 0.95
    },
    {
      "name": "find_issues",
      "category": "api",
      "description": "Search issues using JQL query",
      "score": 0.82
    }
  ]
}
```

---

## 🚨 Critical Rules

### 1. Always regenerate index after adding tools

```bash
# Index is regenerated automatically on build
npm run build

# Or manually:
npm run prebuild
```

### 2. METADATA is required for all tools

```typescript
// ✅ CORRECT
class MyTool extends BaseTool<TFacade> {
  static readonly METADATA: StaticToolMetadata = {
    name: 'my_tool',
    category: 'api',
    description: 'Tool description',
  };
}

// ❌ WRONG (no METADATA)
class MyTool extends BaseTool<TFacade> {
  // Search won't find this tool
}
```

### 3. Use WeightedCombinedStrategy for best results

```typescript
// ✅ CORRECT (default, best accuracy)
const results = engine.search('find tasks');

// ⚠️ OK (specific strategy for special cases)
const exactMatch = engine.search('get_issue', 'name');
```

---

## 📖 API Reference

### Exports

```typescript
// Engine
export { ToolSearchEngine } from './engine/tool-search-engine.js';

// Strategies
export type { SearchStrategy } from './strategies/search-strategy.interface.js';
export { NameSearchStrategy } from './strategies/name-search.strategy.js';
export { DescriptionSearchStrategy } from './strategies/description-search.strategy.js';
export { CategorySearchStrategy } from './strategies/category-search.strategy.js';
export { FuzzySearchStrategy } from './strategies/fuzzy-search.strategy.js';
export { WeightedCombinedStrategy } from './strategies/weighted-combined.strategy.js';

// Scoring
export { STRATEGY_WEIGHTS } from './scoring/strategy-weights.js';

// Tools
export { SearchToolsTool } from './tools/search-tools.tool.js';
export { SearchToolsDefinition } from './tools/search-tools.definition.js';

// Generated index
export { TOOL_INDEX } from './generated-index.js';

// Types
export type { ToolMetadata, SearchResult, StrategyWeights } from './types.js';
```

---

## 🧪 Testing

**Run tests:**
```bash
cd packages/framework/search
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

## 🎯 Advanced Usage

### Custom Search Strategy

```typescript
import { SearchStrategy, ToolMetadata } from '@fractalizer/mcp-search';

class CustomSearchStrategy implements SearchStrategy {
  search(query: string, tools: ToolMetadata[]) {
    return tools
      .filter((tool) => /* custom logic */)
      .map((tool) => ({
        tool,
        score: /* custom scoring */,
      }));
  }
}

// Use custom strategy
const engine = new ToolSearchEngine(TOOL_INDEX);
engine.registerStrategy('custom', new CustomSearchStrategy());
const results = engine.search('query', 'custom');
```

### Adjusting Weights

```typescript
import { STRATEGY_WEIGHTS } from '@fractalizer/mcp-search';

const customWeights = {
  ...STRATEGY_WEIGHTS,
  name: 0.5,        // Increase name importance
  description: 0.3,
  category: 0.1,
  fuzzy: 0.1,
};

const strategy = new WeightedCombinedStrategy(customWeights);
```

---

## 🤝 Contributing

See [../../.github/CONTRIBUTING.md](../../.github/CONTRIBUTING.md)

**Architecture rules:** [../../CLAUDE.md](../../CLAUDE.md)

---

## 📄 License

PolyForm Shield License 1.0.0

---

## 🔗 Links

- **Monorepo root:** [../../README.md](../../README.md)
- **Architecture:** [../../ARCHITECTURE.md](../../ARCHITECTURE.md)
- **Core package:** [../core/README.md](../core/README.md)
