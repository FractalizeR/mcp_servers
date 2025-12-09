# TickTick MCP Server

MCP сервер для интеграции TickTick (todo-list приложения) с Claude и другими MCP клиентами.

## Особенности

- **24 инструмента** для работы с проектами и задачами
- **Фильтрация полей** — экономия 80-90% контекста через `fields` параметр
- **Параллельные запросы** — до 5 одновременных (ParallelExecutor)
- **Отключение групп** — `DISABLED_TOOL_GROUPS`
- **Lazy/Eager режимы** — `TOOL_DISCOVERY_MODE`
- **Кеширование** — 5 минут TTL
- **OAuth 2.0** с поддержкой refresh token
- **Поддержка Dida365** (китайская версия TickTick)
- **GTD-helpers** — get_engaged_tasks, get_next_tasks

---

## Быстрый старт

### 1. Получите токен TickTick

Используйте один из методов:
- OAuth flow через [ticktick-py](https://github.com/lazeroffmichael/ticktick-py)
- Получите токен через Developer Portal

### 2. Настройте переменные окружения

```bash
# Обязательно
TICKTICK_ACCESS_TOKEN=your_access_token

# Опционально (для auto-refresh)
TICKTICK_CLIENT_ID=your_client_id
TICKTICK_CLIENT_SECRET=your_client_secret
TICKTICK_REFRESH_TOKEN=your_refresh_token
```

### 3. Добавьте в Claude Desktop

```json
{
  "mcpServers": {
    "ticktick": {
      "command": "npx",
      "args": ["@fractalizer/mcp-server-ticktick"],
      "env": {
        "TICKTICK_ACCESS_TOKEN": "your_token"
      }
    }
  }
}
```

---

## Инструменты

### Projects (6 tools)

| Tool | Описание | Приоритет |
|------|----------|-----------|
| `get_projects` | Получить все проекты | high |
| `get_project` | Получить проект по ID | high |
| `get_project_tasks` | Получить задачи проекта | high |
| `create_project` | Создать проект | normal |
| `update_project` | Обновить проект | normal |
| `delete_project` | Удалить проект | low |

### Tasks (10 tools)

| Tool | Описание | Приоритет |
|------|----------|-----------|
| `get_task` | Получить задачу | critical |
| `get_tasks` | Получить несколько задач (batch) | critical |
| `get_all_tasks` | Все задачи пользователя | high |
| `search_tasks` | Поиск по тексту | high |
| `create_task` | Создать задачу | critical |
| `batch_create_tasks` | Массовое создание | high |
| `update_task` | Обновить задачу | critical |
| `complete_task` | Завершить задачу | high |
| `delete_task` | Удалить задачу | normal |
| `get_tasks_by_priority` | Фильтр по приоритету | normal |

### Date Queries (5 tools)

| Tool | Описание | Приоритет |
|------|----------|-----------|
| `get_tasks_due_today` | Срок сегодня | high |
| `get_tasks_due_tomorrow` | Срок завтра | normal |
| `get_tasks_due_in_days` | Срок в N дней | normal |
| `get_tasks_due_this_week` | Срок на неделе | normal |
| `get_overdue_tasks` | Просроченные | high |

### Helpers (3 tools)

| Tool | Описание | Приоритет |
|------|----------|-----------|
| `ping` | Проверка подключения | critical |
| `get_engaged_tasks` | GTD: горящие (high priority + overdue) | normal |
| `get_next_tasks` | GTD: следующие (medium priority + tomorrow) | normal |

---

## Конфигурация

### Переменные окружения

```bash
# API (для Dida365 используйте dida365.com)
TICKTICK_API_BASE_URL=https://api.ticktick.com/open/v1

# Batch/Concurrency
MAX_BATCH_SIZE=100
MAX_CONCURRENT_REQUESTS=5

# Cache
CACHE_TTL_MS=300000

# Tool Discovery
TOOL_DISCOVERY_MODE=eager          # eager | lazy
ENABLED_TOOL_CATEGORIES=           # tasks:read,projects:read
DISABLED_TOOL_GROUPS=              # helpers:gtd,tasks:date
```

### Примеры конфигурации

```bash
# Только чтение (безопасный режим)
ENABLED_TOOL_CATEGORIES="tasks:read,projects:read,helpers"

# Без GTD и date queries
DISABLED_TOOL_GROUPS="helpers:gtd,tasks:date"

# Lazy mode (только ping в tools/list, остальные через search)
TOOL_DISCOVERY_MODE=lazy
```

### Для Dida365 (китайская версия)

```bash
TICKTICK_API_BASE_URL=https://api.dida365.com/open/v1
```

---

## Фильтрация полей

Все read-операции поддерживают параметр `fields` для экономии контекста:

```json
{
  "fields": ["id", "title", "priority", "dueDate"]
}
```

Это уменьшает размер ответа на 80-90%.

---

## Разработка

```bash
# Установка зависимостей (из корня monorepo)
npm install

# Сборка
npm run build --workspace=@fractalizer/mcp-server-ticktick

# Тесты
npm run test --workspace=@fractalizer/mcp-server-ticktick

# Валидация
npm run validate:quiet --workspace=@fractalizer/mcp-server-ticktick
```

---

## Архитектура

```
src/
├── composition-root/      # DI контейнер (InversifyJS)
├── config/               # Загрузка конфигурации
├── ticktick_api/
│   ├── api_operations/   # HTTP операции
│   ├── auth/            # OAuth 2.0
│   ├── dto/             # Data Transfer Objects
│   ├── entities/        # Task, Project entities
│   ├── facade/          # TickTickFacade
│   └── http/            # HTTP клиент
└── tools/
    ├── api/             # MCP tools
    │   ├── date-queries/
    │   ├── projects/
    └── helpers/         # ping, GTD tools
```

---

## Ссылки

- [TickTick API (через Pipedream)](https://pipedream.com/apps/ticktick)
- [ticktick-py (Python client)](https://github.com/lazeroffmichael/ticktick-py)
- [ticktick-mcp (Python MCP, референс)](https://github.com/jacepark12/ticktick-mcp)
- [MCP Protocol](https://github.com/anthropics/mcp)
