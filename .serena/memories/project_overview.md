# Обзор проекта (обновлено после миграции на monorepo)

## Структура проекта

```
packages/
├── infrastructure/  # HTTP, cache, logging, async utilities
├── core/           # BaseTool, registry, type system
├── search/         # Tool Search Engine
└── yandex-tracker/ # Yandex Tracker MCP Server
```

## Тесты

- Unit тесты в `packages/*/tests/` (зеркалируют `packages/*/src/`)
- Integration тесты в `packages/yandex-tracker/tests/integration/`
- E2E тесты в `packages/yandex-tracker/tests/workflows/`

## Ключевые файлы

- CLAUDE.md - правила для ИИ агентов
- ARCHITECTURE.md - архитектура monorepo
- DOCS.md - навигация по документации
