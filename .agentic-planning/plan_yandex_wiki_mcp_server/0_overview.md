# План: MCP Server для Yandex Wiki

## Цель
Создать MCP сервер `mcp-server-yandex-wiki` для работы с API Yandex Wiki.

## Ключевые решения

| Решение | Значение |
|---------|----------|
| Пакет | `packages/servers/yandex-wiki/` |
| NPM name | `mcp-server-yandex-wiki` |
| Токен | `YANDEX_WIKI_TOKEN` (отдельный) |
| Префикс | `yw_` |
| Base URL | `https://api.wiki.yandex.net` (hardcoded) |
| Batch | Не требуется |

## API Yandex Wiki

### Pages API (7 методов) — Приоритет 1
| Tool | HTTP | Endpoint |
|------|------|----------|
| `yw_get_page` | GET | `/v1/pages?slug={slug}` |
| `yw_get_page_by_id` | GET | `/v1/pages/{idx}` |
| `yw_create_page` | POST | `/v1/pages` |
| `yw_update_page` | POST | `/v1/pages/{idx}` |
| `yw_delete_page` | DELETE | `/v1/pages/{idx}` |
| `yw_clone_page` | POST | `/v1/pages/{idx}/clone` |
| `yw_append_content` | POST | `/v1/pages/{idx}/append-content` |

### Grids API (12 методов) — Приоритет 2
| Tool | HTTP | Endpoint |
|------|------|----------|
| `yw_create_grid` | POST | `/v1/grids` |
| `yw_get_grid` | GET | `/v1/grids/{idx}` |
| `yw_update_grid` | POST | `/v1/grids/{idx}` |
| `yw_delete_grid` | DELETE | `/v1/grids/{idx}` |
| `yw_add_rows` | POST | `/v1/grids/{idx}/rows` |
| `yw_remove_rows` | DELETE | `/v1/grids/{idx}/rows` |
| `yw_add_columns` | POST | `/v1/grids/{idx}/columns` |
| `yw_remove_columns` | DELETE | `/v1/grids/{idx}/columns` |
| `yw_update_cells` | POST | `/v1/grids/{idx}/cells` |
| `yw_move_rows` | POST | `/v1/grids/{idx}/rows/move` |
| `yw_move_columns` | POST | `/v1/grids/{idx}/columns/move` |
| `yw_clone_grid` | POST | `/v1/grids/{idx}/clone` |

### Resources API (1 метод) — Приоритет 3
| Tool | HTTP | Endpoint |
|------|------|----------|
| `yw_get_resources` | GET | `/v1/pages/{idx}/resources` |

## Граф зависимостей

```
1.1 Package Setup
    ↓
1.2 Infrastructure
    ↓
┌───┴───┐
2.1     2.2      ← Можно параллельно
Entities DTOs
└───┬───┘
    ↓
3.1 Page Operations
    ↓
4.1 Facade & Services
    ↓
5.1 Page Tools
    ↓
6.1 Composition Root
    ↓
┌───┴───┐
7.1     8.1      ← Можно параллельно
Tests   Docs
└───┬───┘
    ↓
Pages API Ready ✓
    ↓
┌───┴───┐
9.1     10.1     ← Можно параллельно
Grids   Resources
    ↓
9.2 Grid Tools
```

## Этапы реализации

### Фаза 1: Pages API (Основная)

| Этап | Файл | Тип | Статус |
|------|------|-----|--------|
| 1.1 | `1.1_package_setup_sequential.md` | sequential | [ ] |
| 1.2 | `1.2_infrastructure_sequential.md` | sequential | [ ] |
| 2.1 | `2.1_entities_parallel.md` | parallel | [ ] |
| 2.2 | `2.2_dto_parallel.md` | parallel | [ ] |
| 3.1 | `3.1_page_operations_parallel.md` | parallel | [ ] |
| 4.1 | `4.1_facade_services_sequential.md` | sequential | [ ] |
| 5.1 | `5.1_page_tools_parallel.md` | parallel | [ ] |
| 6.1 | `6.1_composition_root_sequential.md` | sequential | [ ] |
| 7.1 | `7.1_tests_parallel.md` | parallel | [ ] |
| 8.1 | `8.1_documentation_sequential.md` | sequential | [ ] |

### Фаза 2: Grids & Resources (Дополнительная)

| Этап | Файл | Тип | Статус |
|------|------|-----|--------|
| 9.1 | `9.1_grid_operations_parallel.md` | parallel | [ ] |
| 9.2 | `9.2_grid_tools_parallel.md` | parallel | [ ] |
| 10.1 | `10.1_resources_parallel.md` | parallel | [ ] |

## Зависимости от framework

- `@mcp-framework/infrastructure` — HttpClient, Logger, Cache
- `@mcp-framework/core` — BaseTool, ToolRegistry, ResponseFieldFilter
- `@mcp-framework/search` — ToolSearchEngine (опционально)
- `@mcp-framework/cli` — CLI для подключений

## Команды валидации

```bash
# После каждого этапа
cd packages/servers/yandex-wiki
npm run validate:quiet

# Полная валидация monorepo
npm run validate
```

## Промпт для продолжения

```
Продолжить реализацию Yandex Wiki MCP сервера.
План: .agentic-planning/plan_yandex_wiki_mcp_server/
Текущий этап: [указать номер]
```
