# Changelog

All notable changes to `@mcp-framework/infrastructure` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-11-22

### Deprecated

**Domain-specific configuration moved to @mcp-server/yandex-tracker**

The following exports are now deprecated and will be removed in v2.0.0:

#### Types (from `types.ts`)
- `ServerConfig` interface
- `LogLevel` type
- `ParsedCategoryFilter` interface

#### Functions (from `config.ts`)
- `loadConfig()` function

#### Constants (from `constants.ts`)
- `DEFAULT_API_BASE`
- `DEFAULT_LOG_LEVEL`
- `DEFAULT_REQUEST_TIMEOUT`
- `DEFAULT_MAX_BATCH_SIZE`
- `DEFAULT_MAX_CONCURRENT_REQUESTS`
- `DEFAULT_LOGS_DIR`
- `DEFAULT_LOG_MAX_SIZE`
- `DEFAULT_LOG_MAX_FILES`
- `DEFAULT_TOOL_DISCOVERY_MODE`
- `DEFAULT_ESSENTIAL_TOOLS`
- `ENV_VAR_NAMES`

**Reason:** Infrastructure layer should not contain domain-specific code (Yandex Tracker).

### Changed

- All deprecated exports now re-export from `@mcp-server/yandex-tracker/config`
- Backwards compatibility maintained through deprecation warnings
- No breaking changes in this release

### Migration Guide

#### Before (v0.1.0):
```typescript
import { ServerConfig, loadConfig } from '@mcp-framework/infrastructure';
import { DEFAULT_API_BASE, ENV_VAR_NAMES } from '@mcp-framework/infrastructure';
```

#### After (v0.2.0+):
```typescript
// Option 1: Import from yandex-tracker package
import { ServerConfig, loadConfig } from '@mcp-server/yandex-tracker/config';
import { DEFAULT_API_BASE, ENV_VAR_NAMES } from '@mcp-server/yandex-tracker/config';

// Option 2: Use alias (within yandex-tracker package only)
import { ServerConfig, loadConfig } from '#config';
import { DEFAULT_API_BASE, ENV_VAR_NAMES } from '#config';
```

### What Remains in Infrastructure

The following **generic** functionality remains in infrastructure (no deprecation):

- HTTP client and utilities (`HttpClient`, `RetryStrategy`, etc.)
- Cache layer (`CacheManager`, `NoOpCache`, `LRUCache`)
- Logging utilities (`Logger`, `createLogger`)
- Async utilities (`ParallelExecutor`, `RateLimiter`)
- Generic types (`ApiResponse`, `ApiError`, `HttpStatusCode`, `BatchResult`, etc.)

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
