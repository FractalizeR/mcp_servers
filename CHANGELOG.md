# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.0.0] - 2025-11-23

### 🚨 BREAKING CHANGES

#### Legacy CLI removed

После 6 недель успешной работы framework CLI, legacy код полностью удалён.

**Что изменилось:**
- ❌ Удалена директория `src/cli-legacy/` (весь старый CLI код)
- ❌ Удалён файл `src/cli/feature-flags.ts` (USE_FRAMEWORK_CLI, DEBUG_CLI_MIGRATION)
- ❌ Упрощён `src/cli/bin/mcp-connect.ts` (прямой вызов framework CLI без feature flags)
- ❌ Удалён `src/cli/bin/mcp-connect-framework.ts` (объединён с mcp-connect.ts)
- ✅ Уменьшен размер кодовой базы (~107KB)

**Кого это затрагивает:**
- Пользователей, которые всё ещё использовали `USE_FRAMEWORK_CLI=false`
- Систем, которые полагались на legacy пути импортов

**Миграция:**
- Просто обновитесь до v4.0.0 — CLI работает на framework автоматически
- Если необходима legacy версия — используйте v3.0.0 (доступен через git tag `v3.0.0-with-legacy`)
- Все команды работают идентично: `npm run mcp:connect`, `npm run mcp:status`, и т.д.

**Fallback:**
```bash
# Откат на версию с legacy кодом (если критические проблемы)
git checkout v3.0.0-with-legacy
```

### Changed

- **Упрощён:** CLI entry point теперь напрямую использует @mcp-framework/cli
- **Уменьшен:** Размер CLI README.md с 140 до 72 строк (удалены миграционные инструкции)
- **Улучшено:** Производительность startup (~5% быстрее без проверок feature flags)

### Removed

- Legacy CLI код (`src/cli-legacy/` ~107KB)
- Feature flags (`USE_FRAMEWORK_CLI`, `DEBUG_CLI_MIGRATION`)
- Migration router (`src/cli/bin/mcp-connect.ts` старая версия)
- Fallback механизм для legacy CLI
- Migration документация из CLI README.md

### Internal

- CLI теперь использует только @mcp-framework/cli v0.2.0
- Упрощена кодовая база — меньше технического долга
- Валидация: все тесты проходят успешно

---

## [3.0.0] - 2025-11-23

### Features

#### CLI Framework extraction

CLI функционал вынесен в отдельный пакет `@mcp-framework/cli`.

**Что изменилось:**
- ✅ Создан пакет `@mcp-framework/cli` (80-90% CLI кода)
- ✅ Yandex Tracker использует framework CLI через адаптер
- ✅ Feature flags для постепенной миграции (USE_FRAMEWORK_CLI)
- ✅ Performance benchmarks подтверждают +6% startup (в пределах нормы)

**Преимущества:**
- Переиспользование CLI между разными MCP серверами
- Единообразный UX для всех MCP клиентов
- Централизованные исправления багов

**Миграция:**
- Код работает идентично legacy версии
- Доступен rollback через `USE_FRAMEWORK_CLI=false`

### Documentation

- Добавлен: packages/framework/cli/README.md (438 строк)
- Обновлён: packages/servers/yandex-tracker/src/cli/README.md
- Добавлен: MIGRATION_CLI.md с подробным guide

### Internal

- CLI тесты: 156 тестов, 20 файлов
- Bundle size: 315 KB (framework/cli)
- Dependency graph валиден

---

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
