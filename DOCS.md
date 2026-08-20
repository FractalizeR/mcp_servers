# Документация проекта — Quick Navigation

**Навигация по всей документации Yandex Tracker MCP**

---

## 🤖 Для ИИ агентов

**ОБЯЗАТЕЛЬНО прочитай перед работой:**
- **[CLAUDE.md](./CLAUDE.md)** — правила monorepo, чек-листы, критические требования
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — архитектура, концепции, паттерны, поток данных
- **[MCP_SERVER_CHECKLIST.md](./MCP_SERVER_CHECKLIST.md)** — чеклист разработки нового MCP сервера
- **[packages/servers/yandex-tracker/CLAUDE.md](./packages/servers/yandex-tracker/CLAUDE.md)** — правила Yandex Tracker пакета

---

## 📚 Для разработчиков

**Основные документы:**
- **[README.md](./README.md)** — обзор monorepo и quick start
- **[DOC_STANDARDS.md](./DOC_STANDARDS.md)** — стандарты структуры документации
- **[.github/CONTRIBUTING.md](./.github/CONTRIBUTING.md)** — вклад в проект

---

## 🧪 Тестирование

- **[packages/servers/TESTING_STRATEGY.md](./packages/servers/TESTING_STRATEGY.md)** — что проверяем, чтобы утверждать «инструмент работает» (канон для всех серверов)

---

## 📦 Framework Packages

- **[Infrastructure](./packages/framework/infrastructure/README.md)** — HTTP, cache, logging, async utilities
- **[CLI](./packages/framework/cli/README.md)** — Generic CLI для MCP подключений
- **[Core](./packages/framework/core/README.md)** — BaseTool, registry, type system, utilities
- **[Dev Client](./packages/framework/dev-client/README.md)** — dev-интерфейс вызова MCP-инструментов (`mcp-dev`)

---

## 🚀 Yandex Tracker Server

**Package-level:**
- **[README.md](./packages/servers/yandex-tracker/README.md)** — пользовательская документация
- **[CLAUDE.md](./packages/servers/yandex-tracker/CLAUDE.md)** — правила для разработчиков
- **[tests/README.md](./packages/servers/yandex-tracker/tests/README.md)** — архитектура тестирования
- **[tests/TESTING_STRATEGY.md](./packages/servers/yandex-tracker/tests/TESTING_STRATEGY.md)** — специфика тестирования Трекера (песочница, версии API, известные дефекты)

**Module-level:**
- **[MCP Tools](./packages/servers/yandex-tracker/src/tools/README.md)** — конвенции разработки tools
- **[API Operations](./packages/servers/yandex-tracker/src/tracker_api/api_operations/README.md)** — конвенции operations
- **[Entities](./packages/servers/yandex-tracker/src/tracker_api/entities/README.md)** — entity конвенции
- **[DTO](./packages/servers/yandex-tracker/src/tracker_api/dto/README.md)** — DTO паттерны
- **[Composition Root](./packages/servers/yandex-tracker/src/composition-root/README.md)** — Dependency Injection
- **[CLI](./packages/servers/yandex-tracker/src/cli/README.md)** — управление подключениями

---

## 🔗 Внешние ресурсы

- **API Яндекс.Трекер:** https://cloud.yandex.ru/docs/tracker/about-api
- **MCP Protocol:** https://github.com/anthropics/mcp
- **InversifyJS:** https://inversify.io/
- **Pino logger:** https://github.com/pinojs/pino
