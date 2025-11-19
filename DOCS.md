# Документация проекта — Навигация

**Полный индекс всей документации Yandex Tracker MCP**

---

## 📖 Для ИИ агентов (обязательно)

| Файл | Назначение | Размер |
|------|-----------|--------|
| **[CLAUDE.md](./CLAUDE.md)** | ✅ **Главный файл** — правила, чек-листы, критические требования | 338 строк |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Архитектура проекта — концепции, паттерны, поток данных | 565 строк |

> **Примечание:** Размеры актуальны на момент последней валидации.
> Текущие размеры проверяй через `npm run validate:docs`.

---

## 📚 Для разработчиков

### Основные файлы

| Файл | Назначение |
|------|-----------|
| **[README.md](./README.md)** | Общая документация — установка, использование, быстрый старт |
| **[DOCS.md](./DOCS.md)** | 🗺️ Этот файл — навигация по всей документации |

### Тесты

| Файл | Назначение |
|------|-----------|
| **[tests/README.md](./packages/servers/yandex-tracker/tests/README.md)** | Архитектура тестирования — типы тестов, helpers, изоляция |

---

## 🔧 Модульная документация

### MCP слой

| Файл | Назначение | Размер |
|------|-----------|--------|
| **[packages/servers/yandex-tracker/src/tools/README.md](./packages/servers/yandex-tracker/src/tools/README.md)** | MCP Tools — конвенции, шаблоны, чек-листы |  |

### Tracker API слой

| Файл | Назначение |
|------|-----------|
| **[packages/servers/yandex-tracker/src/tracker_api/api_operations/README.md](./packages/servers/yandex-tracker/src/tracker_api/api_operations/README.md)** | API Operations — конвенции, BaseOperation, batch-операции |
| **[packages/servers/yandex-tracker/src/tracker_api/entities/README.md](./packages/servers/yandex-tracker/src/tracker_api/entities/README.md)** | Entities — WithUnknownFields, структура, правила |
| **[packages/servers/yandex-tracker/src/tracker_api/dto/README.md](./packages/servers/yandex-tracker/src/tracker_api/dto/README.md)** | DTO — Input/Output паттерны, кастомные поля |

### Composition Root (DI)

| Файл | Назначение |
|------|-----------|
| **[packages/servers/yandex-tracker/src/composition-root/README.md](./packages/servers/yandex-tracker/src/composition-root/README.md)** | Dependency Injection — Symbol-based tokens, автоматическая регистрация, примеры использования |

### CLI инструмент

| Файл | Назначение | Размер |
|------|-----------|--------|
| **[packages/servers/yandex-tracker/src/cli/README.md](./packages/servers/yandex-tracker/src/cli/README.md)** | CLI — управление подключениями, connectors, архитектура | ~360 строк |

---

## 📏 Лимиты размера документации

**Жёсткие лимиты (MUST):**

| Тип файла | Лимит | Проверка |
|-----------|-------|----------|
| CLAUDE.md | ≤400 строк | `npm run validate:docs` |
| ARCHITECTURE.md | ≤700 строк | `npm run validate:docs` |
| Module README.md | ≤500 строк | `npm run validate:docs` |
| Package README.md | ≤600 строк | `npm run validate:docs` |
| tests/README.md | ≤500 строк | `npm run validate:docs` |

**Целевые значения (SHOULD):**

| Тип файла | Цель |
|-----------|------|
| CLAUDE.md | ~350 строк |
| ARCHITECTURE.md | ~600 строк |
| Module README.md | ~400 строк |
| Package README.md | ~500 строк |
| tests/README.md | ~400 строк |

---

## 🔗 Внешние ресурсы

- **API Яндекс.Трекер v3:** https://cloud.yandex.ru/docs/tracker/about-api
- **MCP Protocol:** https://github.com/anthropics/mcp
- **InversifyJS v7:** https://inversify.io/
- **Pino logger:** https://github.com/pinojs/pino
