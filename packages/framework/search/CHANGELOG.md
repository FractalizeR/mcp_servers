# Changelog

All notable changes to `@mcp-framework/search` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-11-16

### Added
- Initial release as standalone package
- `ToolSearchEngine` with LRU cache (max 100 entries)
- 5 search strategies:
  - `NameSearchStrategy` — exact/partial name matching
  - `DescriptionSearchStrategy` — word matching in descriptions
  - `CategorySearchStrategy` — category filtering
  - `FuzzySearchStrategy` — Levenshtein distance for typo tolerance
  - `WeightedCombinedStrategy` — combines all strategies with configurable weights
- Compile-time tool indexing (generated-index.ts)
- `SearchToolsTool` — MCP tool for Claude to discover available tools
- Configurable strategy weights

### Changed
- Extracted from `mcp-server-yandex-tracker` v1.x into separate package
- Tool indexing moved from runtime to compile-time (performance improvement)

## Previous Versions

See `mcp-server-yandex-tracker` package for versions prior to 0.1.0.
