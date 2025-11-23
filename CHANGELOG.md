# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-11-23

### BREAKING CHANGES

#### Infrastructure: Removed domain-specific configuration

- **Removed:** `ServerConfig`, `loadConfig` from `@mcp-framework/infrastructure`
- **Migration:** Use configuration from `@mcp-server/yandex-tracker/config` instead
- **Reason:** Infrastructure layer must be domain-agnostic. Configuration logic belongs to the application layer, not the framework layer.
- **Impact:** Breaking change for consumers who imported config from infrastructure package
- **Commit:** [2804d9e](../../commit/2804d9e)

#### CacheManager: Async interface

- **Changed:** All CacheManager methods now return `Promise`
  - `get<T>(key: string): Promise<T | null>` (was synchronous)
  - `set(key: string, value: unknown): Promise<void>` (was synchronous)
  - `delete(key: string): Promise<void>` (was synchronous)
  - `clear(): Promise<void>` (was synchronous)
- **Migration:** Add `await` to all cache method calls
- **Added:** `InMemoryCacheManager` with async interface implementation
- **Reason:** Support for external caches (Redis, Memcached) requires async operations
- **Impact:** All code using CacheManager must be updated to await calls
- **Commit:** [9be3578](../../commit/9be3578)

### Features

#### Configurable HTTP retry parameters

- **Added:** `YANDEX_TRACKER_RETRY_ATTEMPTS` environment variable (default: 3)
- **Added:** `YANDEX_TRACKER_RETRY_MIN_DELAY` environment variable (default: 1000ms)
- **Added:** `YANDEX_TRACKER_RETRY_MAX_DELAY` environment variable (default: 10000ms)
- **Benefit:** Allows fine-tuning retry behavior for different environments (dev/staging/prod)
- **Usage:** Set environment variables to configure retry behavior without code changes

#### DI collision protection

- **Added:** Namespace prefixes for DI symbols (`tool:`, `operation:`)
- **Added:** Runtime validation of unique class names on startup
- **Added:** Startup logging of registered DI symbols for debugging
- **Benefit:** Prevents subtle bugs from duplicate class names across modules
- **Example log:**
  ```json
  {
    "toolSymbols": ["PingTool", "GetIssuesTool", ...],
    "operationSymbols": ["PingOperation", "GetIssuesOperation", ...],
    "totalTools": 41,
    "totalOperations": 61
  }
  ```

### Bug Fixes

- Fixed: CacheManager interface now matches documentation (async methods)
- Fixed: Исправлены все тесты для соответствия async CacheManager
- Fixed: InMemoryCacheManager теперь корректно работает с async интерфейсом

### Documentation

- Updated: MIGRATION.md with detailed migration guide from v1.x to v2.0.0
- Updated: infrastructure/README.md (removed config documentation)
- Updated: yandex-tracker/README.md (added retry configuration examples)
- Updated: composition-root/README.md (added DI protection documentation)

### Internal

- Refactored: Перемещён ServerConfig из infrastructure в yandex-tracker
- Improved: Тестовое покрытие для CacheManager: 90%+ для всех пакетов
- Quality: Дублирование кода ≤5% во всех пакетах
- Quality: Все линтеры проходят без ошибок
