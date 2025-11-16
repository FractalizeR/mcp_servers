# Changelog

All notable changes to `mcp-server-yandex-tracker` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-11-16

### Changed
- **BREAKING:** Migrated to monorepo structure
- **BREAKING:** Infrastructure extracted to `@mcp-framework/infrastructure`
- **BREAKING:** Core framework extracted to `@mcp-framework/core`
- **BREAKING:** Search system extracted to `@mcp-framework/search`
- **BREAKING:** `BaseTool` is now generic `BaseTool<YandexTrackerFacade>` (for developers extending the codebase)

### Added
- Tool search system with 5 strategies (via `@mcp-framework/search`)
- `search_tools` MCP tool for Claude to discover available tools
- Compile-time tool indexing (performance improvement)
- Enhanced documentation structure (README per package)
- Migration guide (MIGRATION.md)
- Monorepo architecture documentation (ARCHITECTURE.md)

### Fixed
- Improved TypeScript project references for faster builds
- Enhanced dependency graph validation

### Notes
- **For end users:** No configuration changes required
- **For developers:** See [MIGRATION.md](../../MIGRATION.md) for upgrade guide
- Framework packages (`@mcp-framework/*`) are now available for reuse in other projects

## [1.x.x] - Previous Versions

See git history for versions 1.0.0 - 1.x.x (single package architecture).

### Key Features in 1.x
- Batch operations for Yandex.Tracker API v3
- MCP tools for issues, users, comments
- InversifyJS dependency injection
- Comprehensive test coverage (≥80%)
- Production logging with Pino
- Field filtering for token optimization

---

For detailed migration instructions, see [MIGRATION.md](../../MIGRATION.md).
