# Changelog

All notable changes to `@mcp-framework/core` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres on [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-11-16

### Added
- Initial release as standalone package
- Generic `BaseTool<TFacade>` for facade-agnostic tool development
- `BaseDefinition` abstract class for MCP tool definitions
- `ToolRegistry` with lazy initialization and routing
- Utilities: `ResponseFieldFilter`, `BatchResultProcessor`, `ResultLogger`
- Common Zod schemas: `FieldsSchema`, `ExpandSchema`, `IssueKeySchema`
- Tool metadata system for compile-time indexing
- Safety warning builder for tools requiring user consent

### Changed
- Extracted from `mcp-server-yandex-tracker` v1.x into separate package
- `BaseTool` made generic (breaking change from v1.x)
- Made domain-agnostic (works with any API facade)

## Previous Versions

See `mcp-server-yandex-tracker` package for versions prior to 0.1.0.
