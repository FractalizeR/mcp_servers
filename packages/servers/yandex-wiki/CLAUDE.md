# CLAUDE.md — Yandex Wiki MCP Server

## Обязательно прочитай

- [Корневой CLAUDE.md](../../../CLAUDE.md) — правила monorepo
- [ARCHITECTURE.md](../../../ARCHITECTURE.md) — архитектура

## Структура пакета

```
src/
├── index.ts                 # Entry point
├── constants.ts             # MCP_TOOL_PREFIX = 'yw'
├── config/                  # Конфигурация
│   ├── server-config.interface.ts
│   ├── constants.ts
│   └── config-loader.ts
├── wiki_api/
│   ├── api_operations/      # HTTP операции
│   │   ├── base-operation.ts
│   │   └── page/*.operation.ts
│   ├── entities/            # Типы данных API
│   │   ├── page.entity.ts
│   │   ├── grid.entity.ts
│   │   └── resource.entity.ts
│   ├── dto/                 # Request DTOs
│   │   ├── page/*.dto.ts
│   │   └── grid/*.dto.ts
│   └── facade/              # Facade + Services
│       ├── yandex-wiki.facade.ts
│       └── services/page.service.ts
├── tools/
│   ├── api/pages/           # Page tools (7 штук)
│   └── helpers/ping/        # Ping tool
├── common/schemas/          # Общие Zod schemas
└── composition-root/        # DI контейнер
    ├── container.ts
    └── definitions/
```

## Добавление нового Tool

1. Создать директорию `src/tools/api/{category}/{action}/`
2. Создать файлы:
   - `{name}.schema.ts` — Zod schema для валидации
   - `{name}.metadata.ts` — метаданные (name, description, tags)
   - `{name}.tool.ts` — класс tool, extends BaseTool
   - `index.ts` — реэкспорт
3. Добавить в `composition-root/definitions/tool-definitions.ts`
4. Запустить `npm run validate`

## Naming Conventions

| Элемент | Формат | Пример |
|---------|--------|--------|
| Tool prefix | `yw_` | `yw_get_page` |
| Tool name | snake_case | `yw_create_page` |
| Operation class | PascalCase | `GetPageOperation` |
| Service class | PascalCase | `PageService` |
| DTO | PascalCase + Dto | `CreatePageDto` |

## API особенности Yandex Wiki

- **Base URL:** `https://api.wiki.yandex.net/v1/`
- **Update через POST** (не PATCH) — Wiki API специфика
- **Асинхронные операции:** clone возвращает `status_url`
- **ID страницы:** integer (`idx`)
- **Slug страницы:** string path (например `users/docs/readme`)
- **Требуется:** `X-Org-ID` или `X-Cloud-Org-ID` в заголовках

## Зависимости от framework

```typescript
import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import { IHttpClient, Logger, CacheManager } from '@fractalizer/mcp-infrastructure';
```

## Валидация

```bash
# Полная валидация (lint + typecheck + test)
npm run validate

# Для AI агентов (минимальный вывод)
npm run validate:quiet

# Только тесты
npm run test

# С coverage
npm run test:coverage
```

## Текущий статус реализации

### Фаза 1: Pages API (завершена)

- [x] Package setup
- [x] Infrastructure (config, constants)
- [x] Entities (Page, Grid, Resource, Operation)
- [x] DTOs (CreatePage, UpdatePage, ClonePage, AppendContent)
- [x] Page Operations (7 штук)
- [x] Facade + PageService
- [x] Page Tools (7 штук + ping)
- [x] Composition Root
- [x] Unit Tests для operations
- [x] Documentation

### Фаза 2: Grids & Resources (не начата)

- [ ] Grid Operations (12 штук)
- [ ] Grid Tools
- [ ] Resources Tool
