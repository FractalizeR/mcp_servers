# Changelog

All notable changes to `@mcp-framework/infrastructure` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-11-16

### Added
- Initial release as standalone package
- HTTP client with retry and error mapping
- Cache manager interface with NoOpCache implementation
- Parallel executor for batch operations with throttling
- Production logging with Pino and rotating-file-stream
- Configuration loader with validation
- Types for API errors and batch results

### Changed
- Extracted from `mcp-server-yandex-tracker` v1.x into separate package
- Made domain-agnostic (no Yandex.Tracker dependencies)

## Previous Versions

See `mcp-server-yandex-tracker` package for versions prior to 0.1.0.
