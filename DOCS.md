# Документация проекта — Навигация

**Полный индекс всей документации Yandex Tracker MCP**

---

## 📖 Для ИИ агентов (обязательно)

| Файл | Назначение | Размер |
|------|-----------|--------|
| **[CLAUDE.md](./CLAUDE.md)** | ✅ **Главный файл** — правила, чек-листы, критические требования | ~250 строк |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Архитектура проекта — концепции, паттерны, поток данных | ~400 строк |

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
| **[tests/README.md](./tests/README.md)** | Архитектура тестирования — типы тестов, helpers, изоляция |

---

## 🔧 Модульная документация

### MCP слой

| Файл | Назначение | Размер |
|------|-----------|--------|
| **[src/mcp/README.md](./src/mcp/README.md)** | MCP Tools — конвенции, шаблоны, чек-листы |  |
| **[src/mcp/search/README.md](./src/mcp/search/README.md)** | Tool Search System — compile-time индексирование | ~100 строк |
| **[src/mcp/tools/common/README.md](./src/mcp/tools/common/README.md)** | Переиспользуемые утилиты — BaseTool, ResponseFieldFilter, BatchResultProcessor | ~190 строк |

### Tracker API слой

| Файл | Назначение |
|------|-----------|
| **[src/tracker_api/api_operations/README.md](./src/tracker_api/api_operations/README.md)** | API Operations — конвенции, BaseOperation, batch-операции |
| **[src/tracker_api/entities/README.md](./src/tracker_api/entities/README.md)** | Entities — WithUnknownFields, структура, правила |
| **[src/tracker_api/dto/README.md](./src/tracker_api/dto/README.md)** | DTO — Input/Output паттерны, кастомные поля |

### Infrastructure слой

| Файл | Назначение | Размер |
|------|-----------|--------|
| **[src/infrastructure/README.md](./src/infrastructure/README.md)** | Infrastructure — HTTP, кеш, async, конфигурация | ~190 строк |
| **[src/infrastructure/logging/README.md](./src/infrastructure/logging/README.md)** | Logging — Pino, ротация, structured JSON, alerting | ~220 строк |

### Composition Root (DI)

| Файл | Назначение |
|------|-----------|
| **[src/composition-root/README.md](./src/composition-root/README.md)** | Dependency Injection — Symbol-based tokens, автоматическая регистрация, примеры использования |

### CLI инструмент

| Файл | Назначение | Размер |
|------|-----------|--------|
| **[src/cli/README.md](./src/cli/README.md)** | CLI — управление подключениями, connectors, архитектура | ~360 строк |

---

## 📏 Лимиты размера документации

**Жёсткие лимиты (MUST):**

| Тип файла | Лимит | Проверка |
|-----------|-------|----------|
| CLAUDE.md | ≤300 строк | `npm run validate:docs` |
| ARCHITECTURE.md | ≤500 строк | `npm run validate:docs` |
| Module README.md | ≤500 строк | `npm run validate:docs` |

**Целевые значения (SHOULD):**

| Тип файла | Цель |
|-----------|------|
| CLAUDE.md | ~250 строк |
| ARCHITECTURE.md | ~400 строк |
| Module README.md | ~300-400 строк |

---

## 🔗 Внешние ресурсы

- **API Яндекс.Трекер v3:** https://cloud.yandex.ru/docs/tracker/about-api
- **MCP Protocol:** https://github.com/anthropics/mcp
- **InversifyJS v7:** https://inversify.io/
- **Pino logger:** https://github.com/pinojs/pino
