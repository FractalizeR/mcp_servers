# Changelog

Все значимые изменения в этом проекте будут задокументированы в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
и этот проект придерживается [Semantic Versioning](https://semver.org/lang/ru/).

## [2.1.0] - 2025-11-17

### Major Changes

#### 🏗️ Multi-Server Architecture

Реструктуризация monorepo для поддержки множественных MCP серверов:

**Breaking Changes:**
- Package переименован: `mcp-server-yandex-tracker` → `@mcp-server/yandex-tracker`
- Bundle переименован: `bundle.js` → `yandex-tracker.bundle.js`
- Структура директорий изменена:
  - `packages/infrastructure` → `packages/framework/infrastructure`
  - `packages/core` → `packages/framework/core`
  - `packages/search` → `packages/framework/search`
  - Yandex Tracker server перемещен в `packages/servers/yandex-tracker`

**Improvements:**
- ✅ Поддержка множественных MCP серверов в одном monorepo
- ✅ Четкое разделение Framework vs Servers
- ✅ Именованные бандлы для каждого сервера
- ✅ Упрощенное создание новых серверов
- ✅ Независимое версионирование серверов

**Migration Guide:**
См. [MIGRATION.md](./MIGRATION.md) для деталей миграции с v2.0 на v2.1

### Documentation

- Обновлена вся документация под новую структуру
- Добавлены инструкции по созданию новых серверов
- Обновлены диаграммы архитектуры в ARCHITECTURE.md
- Документация разделена по категориям (framework/servers)

### CI/CD

- Обновлены GitHub Actions workflows для новой структуры
- Настроен dependabot для всех пакетов
- Обновлены пути в конфигурации coverage

---

## [0.1.0] - 2024-XX-XX

### Added

- Initial release
- MCP server for Yandex.Tracker API v3
- Tool search system with 5 search strategies
- Batch operations support
- Response field filtering
- Comprehensive test coverage
- Dependency injection with InversifyJS
- Structured logging with Pino
- CI/CD pipeline for GitHub Actions
- Automated release workflow (npm + MCPB bundle)

---

## Типы изменений

- **Added** — новый функционал
- **Changed** — изменения в существующем функционале
- **Deprecated** — функционал, который будет удален в будущих версиях
- **Removed** — удаленный функционал
- **Fixed** — исправления багов
- **Security** — исправления уязвимостей
