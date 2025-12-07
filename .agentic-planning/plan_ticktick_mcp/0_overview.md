# TickTick MCP Server - План реализации

## Источники информации

**Основные:**
- [ticktick-mcp](https://github.com/jacepark12/ticktick-mcp) — готовый Python MCP (референс)
- [ticktick-py](https://github.com/lazeroffmichael/ticktick-py) — неофициальная Python библиотека
- [Pipedream TickTick](https://pipedream.com/apps/ticktick) — проверенные endpoints

**Ограничения:** Официальная документация (developer.ticktick.com) требует JavaScript, недоступна для парсинга.

---

## Обзор

Создание MCP сервера для TickTick на базе архитектуры Yandex Tracker MCP с преимуществами:
- **Многопоточность** — ParallelExecutor (5 параллельных запросов)
- **Фильтрация полей** — ResponseFieldFilter (экономия 80-90% контекста)
- **Группы инструментов** — DISABLED_TOOL_GROUPS
- **Lazy/Eager режимы** — TOOL_DISCOVERY_MODE
- **Кеширование** — InMemoryCacheManager (5 min TTL)
- **Retry strategy** — Exponential backoff (3 попытки)
- **DI контейнер** — InversifyJS
- **Zod schemas** — Единый источник истины

---

## TickTick API (Open API v1)

**Base URL:** `https://api.ticktick.com/open/v1`
**OAuth 2.0:**
- Authorize: `https://ticktick.com/oauth/authorize`
- Token: `https://ticktick.com/oauth/token`
- Scopes: `tasks:read`, `tasks:write`

**Dida365 (китайская версия):**
- Base: `https://api.dida365.com/open/v1`
- Authorize: `https://dida365.com/oauth/authorize`

### Endpoints (из ticktick-mcp)

| Категория | Endpoint | Описание |
|-----------|----------|----------|
| **Projects** | GET /project | Все проекты |
| | GET /project/{id} | Проект по ID |
| | GET /project/{id}/data | Проект со всеми задачами |
| | POST /project | Создать проект |
| | POST /project/{id} | Обновить проект |
| | DELETE /project/{id} | Удалить проект |
| **Tasks** | GET /project/{pid}/task/{tid} | Получить задачу |
| | POST /task | Создать задачу |
| | POST /batch/task | Batch создание задач |
| | POST /project/{pid}/task/{tid} | Обновить задачу |
| | POST /task/{tid}/complete | Завершить задачу |
| | DELETE /project/{pid}/task/{tid} | Удалить задачу |

### Объекты данных

**Task:**
```typescript
interface Task {
  id: string;
  projectId: string;
  title: string;
  content?: string;
  priority: number;           // 0=none, 1=low, 3=medium, 5=high
  status: number;             // 0=uncompleted, 2=completed
  startDate?: string;         // ISO date
  dueDate?: string;
  timeZone?: string;
  isAllDay?: boolean;
  reminders?: string[];
  repeatFlag?: string;
  tags?: string[];
  items?: ChecklistItem[];    // Subtasks
  completedTime?: string;
  createdTime: string;
  modifiedTime: string;
}
```

**Project:**
```typescript
interface Project {
  id: string;
  name: string;
  color?: string;
  viewMode?: 'list' | 'kanban' | 'timeline';
  kind?: 'TASK' | 'NOTE';
  closed?: boolean;
}
```

---

## Преимущества над существующим ticktick-mcp

| Аспект | ticktick-mcp (Python) | Наш (TypeScript) |
|--------|----------------------|------------------|
| **Параллельные запросы** | Нет | ParallelExecutor (5 concurrent) |
| **Фильтрация полей** | Нет | ResponseFieldFilter (80-90% экономия) |
| **Отключение групп** | Нет | DISABLED_TOOL_GROUPS |
| **Lazy mode** | Нет | TOOL_DISCOVERY_MODE |
| **Batch операции** | Частично | Полные с BatchResult |
| **Кеширование** | Нет | InMemoryCacheManager (5 min) |
| **Retry** | Базовый | Exponential backoff |
| **Type safety** | Python typing | TypeScript + Zod |
| **DI** | Нет | InversifyJS |
| **Tool Search** | Нет | ToolSearchEngine |

---

## MCP Tools (расширенный список)

### Из ticktick-mcp + наши улучшения:

**Projects (6 tools):**
| Tool | Категория | Приоритет |
|------|-----------|-----------|
| get_projects | projects:read | high |
| get_project | projects:read | high |
| get_project_tasks | projects:read | high |
| create_project | projects:write | normal |
| update_project | projects:write | normal |
| delete_project | projects:write | low |

**Tasks (10 tools):**
| Tool | Категория | Приоритет |
|------|-----------|-----------|
| get_task | tasks:read | critical |
| get_tasks (batch) | tasks:read | critical |
| get_all_tasks | tasks:read | high |
| search_tasks | tasks:read | high |
| create_task | tasks:write | critical |
| batch_create_tasks | tasks:write | high |
| update_task | tasks:write | critical |
| complete_task | tasks:write | high |
| delete_task | tasks:write | normal |
| get_tasks_by_priority | tasks:read | normal |

**Date-based (5 tools):**
| Tool | Категория | Приоритет |
|------|-----------|-----------|
| get_tasks_due_today | tasks:date | high |
| get_tasks_due_tomorrow | tasks:date | normal |
| get_tasks_due_in_days | tasks:date | normal |
| get_tasks_due_this_week | tasks:date | normal |
| get_overdue_tasks | tasks:date | high |

**GTD/Helpers (4 tools):**
| Tool | Категория | Приоритет |
|------|-----------|-----------|
| ping | helpers | critical |
| search_tools | helpers | critical |
| get_engaged_tasks | helpers:gtd | normal |
| get_next_tasks | helpers:gtd | normal |

**Итого: 25 tools** (vs 21 в ticktick-mcp)

---

## Архитектура пакета

```
packages/servers/ticktick/
├── src/
│   ├── composition-root/           # DI контейнер
│   │   ├── definitions/
│   │   │   ├── tool-definitions.ts
│   │   │   └── operation-definitions.ts
│   │   ├── container.ts
│   │   └── types.ts
│   │
│   ├── config/                     # Конфигурация
│   │   ├── config-loader.ts
│   │   ├── server-config.interface.ts
│   │   └── constants.ts
│   │
│   ├── ticktick_api/               # API слой
│   │   ├── auth/
│   │   │   └── oauth-client.ts
│   │   ├── http/
│   │   │   └── authenticated-http-client.ts
│   │   ├── api_operations/
│   │   │   ├── projects/           # 6 operations
│   │   │   └── tasks/              # 8 operations
│   │   ├── facade/
│   │   │   └── ticktick.facade.ts
│   │   ├── entities/
│   │   │   ├── task.entity.ts
│   │   │   └── project.entity.ts
│   │   └── dto/
│   │
│   ├── tools/                      # MCP tools
│   │   ├── api/
│   │   │   ├── projects/           # 6 tools
│   │   │   ├── tasks/              # 10 tools
│   │   │   └── date-queries/       # 5 tools
│   │   └── helpers/                # 4 tools
│   │
│   ├── cli/
│   └── index.ts
│
├── tests/
├── package.json
├── CLAUDE.md
└── README.md
```

---

## Этапы реализации

### Этап 1: Инфраструктура (sequential)
1.1. Структура пакета, package.json, tsconfig.json
1.2. Config loader, constants

### Этап 2: OAuth и HTTP (sequential)
2.1. OAuth 2.0 клиент с refresh
2.2. Authenticated HTTP клиент
2.3. DI bindings для HTTP слоя

### Этап 3: API Operations (parallel)
3.1. Project operations (6 файлов) ← можно параллельно
3.2. Task operations (8 файлов) ← можно параллельно
3.3. Entities и DTOs

### Этап 4: Facade и DI (sequential)
4.1. TickTickFacade
4.2. DI container
4.3. Авторегистрация operations

### Этап 5: MCP Tools (parallel)
5.1. Project tools (6) ← можно параллельно
5.2. Task tools (10) ← можно параллельно
5.3. Date query tools (5) ← можно параллельно
5.4. Helper tools (4)

### Этап 6: Интеграция (sequential)
6.1. Tool definitions, registry
6.2. MCP Server initialization
6.3. CLI

### Этап 7: Тестирование (parallel)
7.1. Unit тесты
7.2. Integration тесты
7.3. Smoke тесты

### Этап 8: Документация (parallel)
8.1. README.md
8.2. CLAUDE.md

---

## Переменные окружения

```bash
# OAuth 2.0
TICKTICK_CLIENT_ID=
TICKTICK_CLIENT_SECRET=
TICKTICK_REDIRECT_URI=http://localhost:3000/callback
TICKTICK_ACCESS_TOKEN=
TICKTICK_REFRESH_TOKEN=

# API (для Dida365: https://api.dida365.com/open/v1)
TICKTICK_API_BASE_URL=https://api.ticktick.com/open/v1

# Batch/Concurrency
MAX_BATCH_SIZE=100
MAX_CONCURRENT_REQUESTS=5

# Tool Discovery
TOOL_DISCOVERY_MODE=eager
ENABLED_TOOL_CATEGORIES=
DISABLED_TOOL_GROUPS=

# Cache
CACHE_TTL_MS=300000
```

---

## Примеры конфигурации

```bash
# Только чтение (безопасный режим)
ENABLED_TOOL_CATEGORIES="tasks:read,projects:read,helpers"

# Без GTD и date queries (минимальный набор)
DISABLED_TOOL_GROUPS="helpers:gtd,tasks:date"

# Lazy mode (только ping + search_tools в tools/list)
TOOL_DISCOVERY_MODE=lazy
```

---

## Статус завершения

**✅ ВСЕ ЭТАПЫ ЗАВЕРШЕНЫ**

| Этап | Статус | Описание |
|------|--------|----------|
| 1 | ✅ | Инфраструктура (package.json, tsconfig, config) |
| 2 | ✅ | OAuth и HTTP (oauth-client, authenticated-http-client) |
| 3 | ✅ | API Operations (12 operations для projects/tasks) |
| 4 | ✅ | Facade и DI (TickTickFacade, container, types) |
| 5 | ✅ | MCP Tools (25 tools) |
| 6 | ✅ | Интеграция MCP (tool-definitions, registry, index.ts) |
| 7 | ✅ | Тестирование (OAuth tests + Smoke tests = 29 tests) |
| 8 | ✅ | Документация (README.md, CLAUDE.md) |

**Проверено:**
- API TickTick используется корректно согласно документации
- `npm run validate:quiet` проходит
- Smoke тесты (18 tests) проходят при запуске из корня monorepo

**Команды:**
```bash
# Валидация
npm run validate:quiet

# Smoke тесты (из корня monorepo)
npx vitest run tests/smoke --dir=packages/servers/ticktick
```
