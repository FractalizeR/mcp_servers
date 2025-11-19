# MCP Framework & Yandex Tracker Server

[![CI](https://github.com/FractalizeR/mcp_server_yandex_tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/FractalizeR/mcp_server_yandex_tracker/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Monorepo containing MCP Framework packages and Yandex Tracker integration**

This repository provides:
- 🏗️ **MCP Framework** — reusable packages for building MCP tools
- 🚀 **Yandex Tracker Server** — complete MCP server for Yandex.Tracker API

---

## 📦 Packages

### Framework Packages (Published to npm)

| Package | Version | Description |
|---------|---------|-------------|
| [@mcp-framework/infrastructure](packages/infrastructure) | 0.1.0 | HTTP client, cache, logging, async utilities |
| [@mcp-framework/core](packages/core) | 0.1.0 | Base classes, type system, tool registry |
| [@mcp-framework/search](packages/search) | 0.1.0 | Advanced tool search engine with compile-time indexing |

### Application Package

| Package | Version | Description |
|---------|---------|-------------|
| [mcp-server-yandex-tracker](packages/servers/yandex-tracker) | 0.1.0 | MCP server for Yandex.Tracker API integration (v2/v3) |

---

## 🏗️ Architecture

```
packages/
├── infrastructure/     → @mcp-framework/infrastructure
│   └── HTTP, cache, logging, async utilities
├── core/              → @mcp-framework/core
│   └── BaseTool, registry, type system
├── search/            → @mcp-framework/search
│   └── Tool Search Engine (compile-time indexing)
└── yandex-tracker/    → mcp-server-yandex-tracker
    └── Yandex API, tools, operations, DI
```

**Dependency Graph:**
```
infrastructure (0 dependencies)
    ↓
core (depends on infrastructure)
    ↓
search (depends on core)
    ↓
yandex-tracker (depends on all framework packages)
```

**Details:** [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 🚀 Quick Start

### For Users (Yandex Tracker Server)

**Install and run:**
```bash
npm install -g mcp-server-yandex-tracker
```

**Connect to Claude Desktop:**
Follow instructions in [packages/servers/yandex-tracker/README.md](packages/servers/yandex-tracker/README.md)

### For Framework Users

**Install packages you need:**
```bash
npm install @mcp-framework/infrastructure
npm install @mcp-framework/core
npm install @mcp-framework/search
```

**Usage examples:** See README.md in each package.

### For Contributors

**Clone and setup:**
```bash
git clone https://github.com/FractalizeR/mcp_server_yandex_tracker.git
cd mcp_server_yandex_tracker
npm install
npm run build
npm run test
```

**Read contributing guide:** [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md)

---

## 🛠️ Development

### Workspace Commands

```bash
# Install all dependencies
npm install

# Build all packages (topological order)
npm run build

# Test all packages
npm run test

# Validate entire monorepo
npm run validate

# Clean all packages
npm run clean
```

### Working with Individual Packages

```bash
# Build one package
npm run build --workspace=@mcp-framework/core

# Test one package
npm run test --workspace=mcp-server-yandex-tracker

# All package commands
cd packages/servers/yandex-tracker
npm run <script>
```

### Dependency Management

```bash
# Add dependency to specific package
npm install axios --workspace=@mcp-framework/infrastructure

# Add framework package to yandex-tracker
cd packages/servers/yandex-tracker
npm install @mcp-framework/core
```

---

## 📖 Documentation

### Monorepo

- **[CLAUDE.md](CLAUDE.md)** — AI agent guidelines for monorepo
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — Architecture overview
- **[MIGRATION.md](MIGRATION.md)** — Migration guide v1 → v2
- **[.github/CONTRIBUTING.md](.github/CONTRIBUTING.md)** — Contribution guidelines

### Packages

- **Infrastructure:** [packages/framework/infrastructure/README.md](packages/framework/infrastructure/README.md)
- **Core:** [packages/framework/core/README.md](packages/framework/core/README.md)
- **Search:** [packages/framework/search/README.md](packages/framework/search/README.md)
- **Yandex Tracker:** [packages/servers/yandex-tracker/README.md](packages/servers/yandex-tracker/README.md)

---

## 🧪 Testing

**Run all tests:**
```bash
npm run test
```

**With coverage:**
```bash
npm run test:coverage
```

**Package-specific:**
```bash
npm run test --workspace=@mcp-framework/core
```

**Watch mode:**
```bash
cd packages/servers/yandex-tracker
npm run test:watch
```

---

## 🔍 Code Quality

**Linting:**
```bash
npm run lint              # Check all packages
npm run lint:fix          # Fix auto-fixable issues
```

**Type checking:**
```bash
npm run typecheck         # Check all packages
```

**Architecture validation:**
```bash
npm run depcruise         # Validate dependency graph
npm run depcruise:graph   # Generate visual graph
```

**Security audits:**
```bash
npm run audit:socket      # Supply-chain analysis
npm run audit:secrets     # Scan for leaked secrets
npm run audit:lockfile    # Verify package-lock.json
```

**Dead code detection:**
```bash
npm run knip              # Find unused files/exports/dependencies
```

---

## 📦 Publishing

**Framework packages** (`@mcp-framework/*`) are published to npm registry.
**Application package** (`mcp-server-yandex-tracker`) is published to npm registry.

**Version management:**
- Using [Changesets](https://github.com/changesets/changesets)
- Automated via GitHub Actions on merge to main

**Manual publish (if needed):**
```bash
# Create changeset
npx changeset add

# Version bump
npx changeset version

# Publish (from main branch)
npm run publish:all
```

---

## 🤝 Contributing

We welcome contributions! Please read:

1. **[.github/CONTRIBUTING.md](.github/CONTRIBUTING.md)** — Contribution process
2. **[CLAUDE.md](CLAUDE.md)** — Code conventions and architecture rules
3. **[ARCHITECTURE.md](ARCHITECTURE.md)** — Understanding the codebase

**Quick checklist:**
- ✅ Fork and create a feature branch
- ✅ Follow code conventions (see CLAUDE.md)
- ✅ Add tests (coverage ≥80%)
- ✅ Run `npm run validate` before commit
- ✅ Write clear commit messages
- ✅ Open a Pull Request

---

## 📄 License

MIT License — free to use, modify, and distribute.

See [LICENSE](LICENSE) for details.

---

## 🔗 Links

- **GitHub:** https://github.com/FractalizeR/mcp_server_yandex_tracker
- **Issues:** https://github.com/FractalizeR/mcp_server_yandex_tracker/issues
- **MCP Specification:** https://github.com/anthropics/mcp
- **Yandex.Tracker API:** https://cloud.yandex.ru/docs/tracker/about-api

---

## 💬 Support

**Found a bug or have a question?**
1. Check [issues](https://github.com/FractalizeR/mcp_server_yandex_tracker/issues)
2. Read package documentation (README.md in each package)
3. Create a new issue with details

**Want to help?**
- ⭐ Star the repository
- 🐛 Report bugs
- 💡 Suggest features
- 🔧 Submit Pull Requests

---

<div align="center">

**Built with ❤️ for the MCP community**

[⬆ Back to top](#mcp-framework--yandex-tracker-server)

</div>
