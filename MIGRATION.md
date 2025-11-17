# Migration Guide: v1 → v2 (Monorepo)

**Version 2.0.0 introduces a monorepo structure with breaking changes**

---

## 🎯 What Changed

### Version 1.x (Single Package)
```
mcp-server-yandex-tracker/
├── src/
│   ├── infrastructure/
│   ├── mcp/
│   └── tracker_api/
└── package.json
```

### Version 2.0 (Monorepo)
```
mcp_server_yandex_tracker/
├── packages/
│   ├── infrastructure/     → @mcp-framework/infrastructure
│   ├── core/              → @mcp-framework/core
│   ├── search/            → @mcp-framework/search
│   └── yandex-tracker/    → mcp-server-yandex-tracker
└── package.json (workspace root)
```

---

## 📦 Breaking Changes

### 1. Package Names

**v1.x:**
```bash
npm install mcp-server-yandex-tracker
```

**v2.0:**
```bash
# For end users (Yandex Tracker server)
npm install mcp-server-yandex-tracker

# For framework users (new!)
npm install @mcp-framework/infrastructure
npm install @mcp-framework/core
npm install @mcp-framework/search
```

**Impact:** End users see no change in package name.

---

### 2. Import Paths (For Developers Extending the Server)

**⚠️ Only affects developers who extend or fork the codebase**

#### Infrastructure Components

**v1.x:**
```typescript
import { HttpClient } from './src/infrastructure/http/client/http-client.js';
import { createLogger } from './src/infrastructure/logging/logger.js';
```

**v2.0:**
```typescript
import { HttpClient, createLogger } from '@mcp-framework/infrastructure';
```

#### Core Components

**v1.x:**
```typescript
import { BaseTool } from './src/mcp/tools/base/base-tool.js';
import { ResponseFieldFilter } from './src/mcp/utils/response-field-filter.js';
```

**v2.0:**
```typescript
import { BaseTool, ResponseFieldFilter } from '@mcp-framework/core';
```

#### Search Components

**v1.x:**
```typescript
import { ToolSearchEngine } from './src/mcp/search/tool-search-engine.js';
```

**v2.0:**
```typescript
import { ToolSearchEngine } from '@mcp-framework/search';
```

---

### 3. BaseTool is Now Generic

**v1.x:**
```typescript
import { BaseTool } from './src/mcp/tools/base/base-tool.js';

class MyTool extends BaseTool {
  // this.facade is YandexTrackerFacade (hardcoded)
}
```

**v2.0:**
```typescript
import { BaseTool } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '../api/facade/index.js';

class MyTool extends BaseTool<YandexTrackerFacade> {
  // this.facade is YandexTrackerFacade (via generic)
}
```

**Why:** Framework packages are now domain-agnostic. `BaseTool<TFacade>` works with any API facade.

**Migration:**
1. Add generic parameter: `extends BaseTool` → `extends BaseTool<YandexTrackerFacade>`
2. Import facade type if needed

---

### 4. File Structure Changes

#### Tool Structure

**v1.x:**
```
src/mcp/tools/api/{feature}/{name}.tool.ts
```

**v2.0:**
```
packages/servers/yandex-tracker/src/mcp/tools/api/{feature}/{action}/{name}.tool.ts
```

**Example:**
- v1.x: `src/mcp/tools/api/issue/get-issues.tool.ts`
- v2.0: `packages/servers/yandex-tracker/src/mcp/tools/api/issue/get/get-issues.tool.ts`

#### Infrastructure

**v1.x:**
```
src/infrastructure/
```

**v2.0:**
```
packages/infrastructure/src/
```

---

### 5. Configuration (No Changes)

**✅ Claude Desktop configuration remains the same:**

```json
{
  "mcpServers": {
    "yandex-tracker": {
      "command": "npx",
      "args": ["-y", "mcp-server-yandex-tracker"],
      "env": {
        "YANDEX_TRACKER_TOKEN": "y0_...",
        "YANDEX_ORG_ID": "12345"
      }
    }
  }
}
```

---

## 🔄 Migration Steps

### For End Users (Claude Desktop)

**✅ No migration needed!**

Just update to latest version:
```bash
npm install -g mcp-server-yandex-tracker@latest
```

Configuration stays the same.

---

### For Developers (Extending/Forking)

#### Step 1: Update Repository

**v1.x:**
```bash
git clone https://github.com/FractalizeR/mcp_server_yandex_tracker.git
cd mcp_server_yandex_tracker
npm install
npm run build
```

**v2.0:**
```bash
git clone https://github.com/FractalizeR/mcp_server_yandex_tracker.git
cd mcp_server_yandex_tracker
npm install              # Installs all workspace packages
npm run build            # Builds all packages in topological order
```

#### Step 2: Update Imports

**Find and replace in your custom code:**

```bash
# Infrastructure
sed -i "s|from '@infrastructure/|from '@mcp-framework/infrastructure|g" **/*.ts
sed -i "s|from './src/infrastructure/|from '@mcp-framework/infrastructure|g" **/*.ts

# Core/MCP
sed -i "s|from '@mcp/tools/base/|from '@mcp-framework/core|g" **/*.ts
sed -i "s|from '@mcp/tools/common/|from '@mcp-framework/core|g" **/*.ts
sed -i "s|from '@mcp/utils/|from '@mcp-framework/core|g" **/*.ts

# Search
sed -i "s|from '@mcp/search/|from '@mcp-framework/search|g" **/*.ts
```

#### Step 3: Update BaseTool Extensions

**Before:**
```typescript
class MyCustomTool extends BaseTool {
  // ...
}
```

**After:**
```typescript
import type { YandexTrackerFacade } from 'mcp-server-yandex-tracker';

class MyCustomTool extends BaseTool<YandexTrackerFacade> {
  // ...
}
```

#### Step 4: Update File Paths

**If you added custom tools:**

**v1.x structure:**
```
src/mcp/tools/api/my-feature/my-tool.tool.ts
```

**v2.0 structure:**
```
packages/servers/yandex-tracker/src/mcp/tools/api/my-feature/action/my-tool.tool.ts
```

**Move your files** to match new structure.

#### Step 5: Re-run Tests

```bash
npm run test              # All packages
npm run validate          # Full validation
```

---

## 🆕 New Features in v2.0

### 1. Framework Packages

You can now use framework components in your own projects:

```bash
npm install @mcp-framework/infrastructure
npm install @mcp-framework/core
```

```typescript
import { HttpClient, createLogger } from '@mcp-framework/infrastructure';
import { BaseTool, ToolRegistry } from '@mcp-framework/core';

// Build your own MCP server!
```

### 2. Tool Search System

**New MCP tool:** `search_tools`

```
User: "What tools can I use to work with issues?"
Claude: [uses search_tools { query: "issues" }]
```

5 search strategies:
- Name matching
- Description matching
- Category filtering
- Fuzzy matching (typo-tolerant)
- Weighted combined (default)

### 3. Compile-time Tool Indexing

**v1.x:** Tools discovered at runtime (reflection)

**v2.0:** Tools indexed at build time (zero runtime overhead)

```bash
npm run build
# → Generates packages/search/src/generated-index.ts
```

### 4. Improved TypeScript Support

- Project references (faster builds)
- Incremental compilation
- Better IDE support

---

## 📊 Comparison Table

| Feature | v1.x | v2.0 |
|---------|------|------|
| **Package structure** | Single package | Monorepo (4 packages) |
| **Framework reuse** | ❌ | ✅ (@mcp-framework/*) |
| **BaseTool** | Hardcoded facade | Generic `<TFacade>` |
| **Tool search** | ❌ | ✅ (5 strategies) |
| **Tool indexing** | Runtime | Compile-time |
| **Build system** | TypeScript | Workspaces + project references |
| **Import paths** | Relative | Package names |
| **Dependency graph validation** | ✅ | ✅ (enhanced) |
| **End user install** | `mcp-server-yandex-tracker` | **Same** |
| **Configuration** | `claude_desktop_config.json` | **Same** |

---

## ❓ FAQ

### Q: Do I need to update my Claude Desktop config?
**A:** No! Configuration remains the same.

### Q: Will my existing tools stop working?
**A:** No! End users see no breaking changes.

### Q: I forked v1.x and added custom tools. What now?
**A:** Follow "For Developers" migration steps above. Main changes: imports and BaseTool generic.

### Q: Can I use framework packages separately?
**A:** Yes! Install `@mcp-framework/infrastructure`, `@mcp-framework/core`, or `@mcp-framework/search` independently.

### Q: How do I build from source now?
**A:** Same: `git clone && npm install && npm run build`. Workspace handles all packages automatically.

### Q: What about tests?
**A:** Tests are now per-package: `npm run test` (all) or `npm run test --workspace=@mcp-framework/core` (specific).

### Q: Are there new dependencies?
**A:** Only `lru-cache` for tool search. All other dependencies remain the same.

---

## 🔗 Resources

- **v2.0 Documentation:**
  - [README.md](README.md) — Overview
  - [ARCHITECTURE.md](ARCHITECTURE.md) — Monorepo architecture
  - [CLAUDE.md](CLAUDE.md) — Developer guidelines

- **Framework Packages:**
  - [Infrastructure README](packages/infrastructure/README.md)
  - [Core README](packages/core/README.md)
  - [Search README](packages/search/README.md)

- **Yandex Tracker:**
  - [Yandex Tracker README](packages/servers/yandex-tracker/README.md)
  - [Yandex Tracker CLAUDE.md](packages/servers/yandex-tracker/CLAUDE.md)

- **Contributing:**
  - [CONTRIBUTING.md](.github/CONTRIBUTING.md)

---

## 🆘 Need Help?

- **Issues:** https://github.com/FractalizeR/mcp_server_yandex_tracker/issues
- **Discussions:** https://github.com/FractalizeR/mcp_server_yandex_tracker/discussions

---

## 📝 Changelog

See [CHANGELOG.md](packages/servers/yandex-tracker/CHANGELOG.md) for detailed changes.

**Summary:**
- **v2.0.0** — Monorepo restructure, framework packages, tool search
- **v1.x.x** — Single package architecture

---

<div align="center">

**Thank you for using MCP Server for Yandex.Tracker!**

</div>
