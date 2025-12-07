# Яндекс.Трекер для Claude Desktop

[![npm version](https://img.shields.io/npm/v/mcp-server-yandex-tracker.svg)](https://www.npmjs.com/package/mcp-server-yandex-tracker)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Управляй задачами в Яндекс.Трекере прямо из Claude!**

Этот MCP-сервер позволяет Claude работать с твоими задачами в Яндекс.Трекере: искать, читать, создавать и обновлять их — всё это без переключения между приложениями.

---

## Преимущества, по сравнению с другими решениями

 - **Групповая обработка.** Один запрос к MCP инструменту = несколько запросов к Yandex Tracker.
 - **Поддержка модификации данных** трекера (создание, обновление, связывание задач)
 - **Построен на MCP Framework** — переиспользуемые компоненты для создания MCP серверов
 - **Автогенерация MCP definitions** из Zod schemas — исключает несоответствие schema/definition

---

## Установка

### Способ 1: MCPB Bundle (Рекомендуется)

Скачай готовый `.mcpb` бандл со страницы [GitHub Releases](https://github.com/FractalizeR/mcp_server_yandex_tracker/releases) и установи его напрямую в MCP клиент.

### Способ 2: CLI установка

```bash
# Клонируй репозиторий
git clone https://github.com/FractalizeR/mcp_server_yandex_tracker.git
cd mcp_server_yandex_tracker
npm install && npm run build

# Подключи к MCP клиенту интерактивно
cd packages/servers/yandex-tracker
npm run mcp:connect
```

CLI поддерживает: **Claude Desktop**, **Claude Code**, **Codex**, **Gemini**, **Qwen**

### Способ 3: npm (глобальная установка)

1. **Установи пакет глобально:**
   ```bash
   npm install -g mcp-server-yandex-tracker
   ```

2. **Настрой Claude Desktop** — добавь конфигурацию в `claude_desktop_config.json`:

   **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

   **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

   **Linux:** `~/.config/Claude/claude_desktop_config.json`

   ```json
   {
     "mcpServers": {
       "yandex-tracker": {
         "command": "npx",
         "args": ["-y", "mcp-server-yandex-tracker"],
         "env": {
           "YANDEX_TRACKER_TOKEN": "y0_your_token_here",
           "YANDEX_ORG_ID": "12345678"
         }
       }
     }
   }
   ```

3. **Перезапусти Claude Desktop** — готово!

### Способ 4: Из исходников (для разработчиков)

```bash
# Клонируй monorepo
git clone https://github.com/FractalizeR/mcp_server_yandex_tracker.git
cd mcp_server_yandex_tracker

# Установи зависимости
npm install

# Собери все пакеты
npm run build

# Собери только yandex-tracker
cd packages/servers/yandex-tracker
npm run build
```

**Подключение к Claude Desktop:** см. [../../.github/CONTRIBUTING.md](../../.github/CONTRIBUTING.md)

---

## Получение OAuth токена

### Шаг 1: Создай приложение в Яндекс.OAuth
1. Открой https://oauth.yandex.ru/
2. Нажми **"Создать приложение"**
3. Заполни форму:
   - **Название:** "Claude MCP для Трекера" (любое)
   - **Права доступа:**
     - `tracker:read` (чтение задач)
     - `tracker:write` (создание/редактирование задач)
4. Нажми **"Создать"**

### Шаг 2: Получи токен
1. На странице приложения найди **"OAuth токен"**
2. Скопируй его (начинается с `y0_...`)
3. **ВАЖНО:** Храни токен в безопасности, не показывай никому!

### Шаг 3: Узнай ID организации
1. Открой **Яндекс.Трекер** -> Настройки -> Организация
2. Скопируй **ID организации** (обычно это число)

---

## Примеры использования

После установки просто спроси Claude:

- **Поиск задач:** "Найди все критичные баги в проекте MOBILE"
- **Анализ задач:** "Покажи мои задачи до конца недели"
- **Создание задачи:** "Создай задачу в BACKEND: Исправить ошибку авторизации"
- **Групповые операции:** "Обнови все задачи Sprint-42, статус In Review"
- **Комментарии:** "Добавь комментарий к PROJ-123: Протестировал, работает"

---

## Групповые операции (Batch)

Все операции чтения и записи поддерживают групповой режим для повышения производительности при работе с несколькими задачами.

### Групповые GET операции

Получение данных из нескольких задач с общими параметрами (perPage, expand и т.д.) за один вызов инструмента:

- `get_comments` — Получить комментарии из нескольких задач
- `get_issue_links` — Получить связи из нескольких задач
- `get_issue_changelog` — Получить историю изменений из нескольких задач
- `get_worklogs` — Получить записи времени из нескольких задач
- `get_checklist` — Получить чек-листы из нескольких задач
- `get_attachments` — Получить вложения из нескольких задач

**Пример:**
```json
{
  "issueIds": ["PROJ-1", "PROJ-2", "PROJ-3"],
  "fields": ["id", "text", "createdAt"]
}
```

**Формат ответа (унифицированный):**
```json
{
  "total": 3,
  "successful": [
    { "issueId": "PROJ-1", "comments": [...], "count": 5 },
    { "issueId": "PROJ-2", "comments": [...], "count": 3 }
  ],
  "failed": [
    { "issueId": "PROJ-3", "error": "Задача не найдена" }
  ]
}
```

### Групповые POST/DELETE операции

Модификация нескольких задач с индивидуальными параметрами для каждой:

- `add_comment` — Добавить комментарии к нескольким задачам (каждый со своим текстом)
- `create_link` — Создать несколько связей
- `delete_link` — Удалить несколько связей
- `add_worklog` — Добавить записи времени к нескольким задачам
- `delete_comment` — Удалить комментарии из нескольких задач
- `add_checklist_item` — Добавить пункты чек-листа к нескольким задачам
- `delete_attachment` — Удалить вложения из нескольких задач
- `edit_comment` — Редактировать комментарии в нескольких задачах

**Пример (индивидуальные параметры для каждой задачи):**
```json
{
  "comments": [
    { "issueId": "PROJ-1", "text": "Комментарий для задачи 1" },
    { "issueId": "PROJ-2", "text": "Комментарий для задачи 2", "attachmentIds": ["att1"] }
  ],
  "fields": ["id", "text", "createdAt"]
}
```

**Преимущества групповых операций:**
- Выполнение N операций за один вызов MCP инструмента
- Автоматическая параллелизация (с учетом rate limits)
- Частичная обработка ошибок (некоторые могут успешно выполниться, другие — нет)
- Единообразный формат ответа

---

## Покрытие Yandex Tracker API

Этот MCP сервер поддерживает **9 из 17 категорий** официального API Яндекс.Трекера (покрытие ~53%).

### Поддерживаемые API (42 инструмента)

| API Категория | Инструментов | Описание |
|---------------|-------------|----------|
| **Issues** | 7 | Создание, чтение, обновление, поиск задач |
| **Comments** | 4 | Добавление, редактирование, удаление комментариев |
| **Attachments** | 5 | Загрузка, скачивание, удаление вложений |
| **Links** | 3 | Создание, просмотр, удаление связей между задачами |
| **Checklists** | 4 | Управление чек-листами в задачах |
| **Worklog** | 4 | Учет затраченного времени |
| **Queues** | 6 | Управление очередями задач |
| **Components** | 4 | Управление компонентами проекта |
| **Projects** | 5 | Управление проектами |

### Детальный список инструментов

<details>
<summary><strong>Issues (7 инструментов)</strong></summary>

- `fr_yandex_tracker_create_issue` — Создать новую задачу
- `fr_yandex_tracker_get_issues` — Получить задачи по ключам
- `fr_yandex_tracker_find_issues` — Найти задачи по JQL запросу
- `fr_yandex_tracker_update_issue` — Обновить задачу
- `fr_yandex_tracker_transition_issue` — Изменить статус задачи
- `fr_yandex_tracker_get_issue_transitions` — Получить доступные переходы
- `fr_yandex_tracker_get_issue_changelog` — Получить историю изменений

</details>

<details>
<summary><strong>Comments (4 инструмента)</strong></summary>

- `fr_yandex_tracker_add_comment` — Добавить комментарий к задаче
- `fr_yandex_tracker_get_comments` — Получить все комментарии задачи
- `fr_yandex_tracker_edit_comment` — Редактировать комментарий
- `fr_yandex_tracker_delete_comment` — Удалить комментарий

</details>

<details>
<summary><strong>Attachments (5 инструментов)</strong></summary>

- `fr_yandex_tracker_upload_attachment` — Загрузить файл к задаче
- `fr_yandex_tracker_get_attachments` — Получить список вложений
- `fr_yandex_tracker_download_attachment` — Скачать вложение
- `fr_yandex_tracker_get_thumbnail` — Получить превью изображения
- `fr_yandex_tracker_delete_attachment` — Удалить вложение

</details>

<details>
<summary><strong>Links (3 инструмента)</strong></summary>

- `fr_yandex_tracker_create_link` — Создать связь между задачами
- `fr_yandex_tracker_get_issue_links` — Получить связи задачи
- `fr_yandex_tracker_delete_link` — Удалить связь

</details>

<details>
<summary><strong>Checklists (4 инструмента)</strong></summary>

- `fr_yandex_tracker_add_checklist_item` — Добавить пункт в чек-лист
- `fr_yandex_tracker_get_checklist` — Получить чек-лист задачи
- `fr_yandex_tracker_update_checklist_item` — Обновить пункт чек-листа
- `fr_yandex_tracker_delete_checklist_item` — Удалить пункт из чек-листа

</details>

<details>
<summary><strong>Worklog (4 инструмента)</strong></summary>

- `fr_yandex_tracker_create_worklog` — Добавить запись времени
- `fr_yandex_tracker_get_worklogs` — Получить записи времени задачи
- `fr_yandex_tracker_update_worklog` — Обновить запись времени
- `fr_yandex_tracker_delete_worklog` — Удалить запись времени

</details>

<details>
<summary><strong>Queues (6 инструментов)</strong></summary>

- `fr_yandex_tracker_create_queue` — Создать новую очередь
- `fr_yandex_tracker_get_queues` — Получить список очередей
- `fr_yandex_tracker_get_queue` — Получить информацию об очереди
- `fr_yandex_tracker_update_queue` — Обновить очередь
- `fr_yandex_tracker_get_queue_fields` — Получить поля очереди
- `fr_yandex_tracker_manage_queue_access` — Управление доступом к очереди

</details>

<details>
<summary><strong>Components (4 инструмента)</strong></summary>

- `fr_yandex_tracker_create_component` — Создать компонент
- `fr_yandex_tracker_get_components` — Получить компоненты очереди
- `fr_yandex_tracker_update_component` — Обновить компонент
- `fr_yandex_tracker_delete_component` — Удалить компонент

</details>

<details>
<summary><strong>Projects (5 инструментов)</strong></summary>

- `fr_yandex_tracker_create_project` — Создать проект
- `fr_yandex_tracker_get_projects` — Получить список проектов
- `fr_yandex_tracker_update_project` — Обновить проект
- `fr_yandex_tracker_delete_project` — Удалить проект
- `fr_yandex_tracker_get_project_queues` — Получить очереди проекта

</details>

### Планируется в будущих версиях

- **Sprints** — Управление спринтами
- **Dashboards** — Работа с дашбордами
- **Filters** — Сохраненные фильтры
- **Fields** — Управление пользовательскими полями
- **Users** — Информация о пользователях
- **Macros** — Автоматизация с макросами
- **Webhooks** — Настройка веб-хуков
- **Import** — Импорт задач

---

## Настройка (опционально)

### Доступные параметры

| Параметр | Описание | По умолчанию |
|----------|----------|--------------|
| `YANDEX_TRACKER_TOKEN` | OAuth токен (**обязательно**) | — |
| `YANDEX_ORG_ID` | ID организации (**обязательно**) | — |
| `LOG_LEVEL` | Уровень логов: `debug`, `info`, `warn`, `error` | `info` |
| `REQUEST_TIMEOUT` | Таймаут запросов (мс), 5000-120000 | `30000` |
| `YANDEX_TRACKER_RETRY_ATTEMPTS` | Попыток повтора запроса при ошибке, 0-10 | `3` |
| `YANDEX_TRACKER_RETRY_MIN_DELAY` | Мин. задержка между попытками (мс), 100-5000 | `1000` |
| `YANDEX_TRACKER_RETRY_MAX_DELAY` | Макс. задержка между попытками (мс), 1000-60000 | `10000` |
| `MAX_BATCH_SIZE` | Макс. задач в одном запросе, 1-1000 | `200` |
| `MAX_CONCURRENT_REQUESTS` | Одновременных запросов к API, 1-20 | `5` |
| `TOOL_DISCOVERY_MODE` | Режим обнаружения: `lazy` или `eager` | `lazy` |
| `ENABLED_TOOL_CATEGORIES` | Фильтр категорий (через запятую, case-insensitive) | Все категории |

### Настройка Retry (повтор запросов)

Сервер автоматически повторяет неудачные HTTP запросы при временных сетевых ошибках и перегрузке API (429, 503). Используется exponential backoff стратегия — задержка между попытками увеличивается экспоненциально.

**Когда происходит retry:**
- Временные сетевые ошибки (ECONNRESET, ETIMEDOUT)
- 429 Too Many Requests (превышен rate limit)
- 503 Service Unavailable (API перегружен)

**Настройка параметров:**

```bash
# Количество попыток (0 = без повторов, 10 = максимум)
YANDEX_TRACKER_RETRY_ATTEMPTS=5

# Начальная задержка (мс) — для первой попытки
YANDEX_TRACKER_RETRY_MIN_DELAY=500

# Максимальная задержка (мс) — ограничение для exponential backoff
YANDEX_TRACKER_RETRY_MAX_DELAY=30000
```

**Пример для высоконагруженного окружения:**

```json
{
  "env": {
    "YANDEX_TRACKER_RETRY_ATTEMPTS": "5",
    "YANDEX_TRACKER_RETRY_MIN_DELAY": "2000",
    "YANDEX_TRACKER_RETRY_MAX_DELAY": "20000"
  }
}
```

Это даст более устойчивое поведение при частых ошибках 429 и нестабильной сети.

### Управление инструментами

**Tool Discovery Mode:**
- `lazy` — Claude видит только essential инструменты (ping, search_tools), остальные находит через search_tools
- `eager` — Claude видит все инструменты сразу (рекомендуется для большинства случаев)

**Фильтрация по категориям** (работает в `eager` режиме):

Формат `ENABLED_TOOL_CATEGORIES`:
- `issues,comments` — все подкатегории issues и comments
- `issues:read,comments:write` — только конкретные подкатегории
- `issues,comments:write,queues` — смешанный формат

Доступные категории: `issues`, `queues`, `projects`, `components`, `comments`, `checklists`, `system`, `helpers`

Доступные подкатегории: `read`, `write`, `delete`, `workflow`, `links`, `attachments`, `bulk`, `worklog`

**Примеры использования:**
```bash
# Только чтение задач и комментариев
ENABLED_TOOL_CATEGORIES="issues:read,comments:read"

# Работа с задачами и очередями
ENABLED_TOOL_CATEGORIES="issues,queues"

# Все категории (по умолчанию)
ENABLED_TOOL_CATEGORIES=""
```

### Пример полной конфигурации

```json
{
  "mcpServers": {
    "yandex-tracker": {
      "command": "npx",
      "args": ["-y", "mcp-server-yandex-tracker"],
      "env": {
        "YANDEX_TRACKER_TOKEN": "y0_your_token_here",
        "YANDEX_ORG_ID": "12345678",
        "LOG_LEVEL": "info",
        "REQUEST_TIMEOUT": "30000",
        "YANDEX_TRACKER_RETRY_ATTEMPTS": "3",
        "YANDEX_TRACKER_RETRY_MIN_DELAY": "1000",
        "YANDEX_TRACKER_RETRY_MAX_DELAY": "10000",
        "TOOL_DISCOVERY_MODE": "eager",
        "ENABLED_TOOL_CATEGORIES": "issues,comments:read,queues"
      }
    }
  }
}
```

---

## Устранение проблем

| Проблема | Решение |
|----------|---------|
| Claude не видит инструменты | Проверь токен/org ID, перезапусти Claude, проверь логи |
| Invalid token | Проверь токен (начинается с `y0_`), права (`tracker:read`, `tracker:write`) |
| Organization not found | Проверь ID организации и доступ к ней |
| Инструментов меньше, чем ожидалось | Проверь `ENABLED_TOOL_CATEGORIES`, посмотри логи с `LOG_LEVEL=debug` |

---

## Безопасность

**Защита токенов:**
- Токены передаются через переменные окружения
- Токены не попадают в логи
- Минимальный набор прав: `tracker:read`, `tracker:write`
- **Никогда** не коммить токены в Git!

**Опасные операции** (требуют подтверждения):
Инструменты изменения данных (create, update, delete) требуют явного подтверждения от пользователя.

**Безопасные операции** (только чтение): ping, get, find, search

---

## Логи и отладка

**Расположение логов:**
- macOS: `~/Library/Application Support/Claude/logs/`
- Windows: `%APPDATA%\Claude\logs\`
- Linux: `~/.config/Claude/logs/`

**Debug-логи:** В конфигурации установи `"LOG_LEVEL": "debug"` и перезапусти Claude.

**Автоматическая ротация:** Логи сжимаются в `.gz` (20 файлов x 50KB = ~1MB).

---

## Для разработчиков

### CLI для подключения к MCP клиентам

Этот пакет использует **@mcp-framework/cli** — универсальный CLI framework для управления MCP подключениями.

**Быстрый старт:**
```bash
# Собрать проект
npm run build

# Подключить к MCP клиенту
npm run mcp:connect

# Проверить статус
npm run mcp:status
```

**Конфигурация Yandex Tracker:**
- OAuth токен (не сохраняется, вводится при каждом подключении)
- ID организации (сохраняется в конфигурации клиента)
- API URL (опционально)

**Подробности:** [src/cli/README.md](src/cli/README.md) | [Framework CLI](../../framework/cli/README.md)

### Архитектура

Этот пакет построен на **MCP Framework** — переиспользуемых компонентах:
- **[@mcp-framework/infrastructure](../../framework/infrastructure/README.md)** — HTTP, кэш, логирование
- **[@mcp-framework/core](../../framework/core/README.md)** — BaseTool, реестр, утилиты
- **[@mcp-framework/search](../../framework/search/README.md)** — Поисковый движок

### Структура пакета

```
src/
├── cli/                 # CLI утилиты для подключения к MCP клиентам
├── common/              # Общие схемы и type guards
├── composition-root/    # DI контейнер (InversifyJS)
├── config/              # Конфигурация сервера
├── tools/               # MCP инструменты
│   ├── api/            # API инструменты (issues, comments, queues и т.д.)
│   └── helpers/        # Вспомогательные инструменты (ping, issue-url, demo)
├── tracker_api/         # Слой Yandex Tracker API
│   ├── api_operations/ # API операции
│   ├── dto/            # Data Transfer Objects
│   ├── entities/       # Domain entities
│   ├── facade/         # Facade для упрощения доступа к API
│   └── utils/          # Утилиты (пагинация, duration, файловые операции)
└── index.ts            # Точка входа
```

**Подробности:** [CLAUDE.md](./CLAUDE.md)

### Команды для разработки

```bash
# Сборка
npm run build              # Полная сборка: TypeScript -> JavaScript -> bundle
                           # (auto: generate index, increment build number)
npm run build:bundle       # Только бандл с инкрементом build number
npm run build:mcpb         # Создать .mcpb архив для публикации

# Тестирование
npm run test               # Все unit тесты
npm run test:smoke         # Дымовой тест (запуск сервера)
npm run test:coverage      # Тесты с покрытием кода
npm run test:watch         # Watch режим
npm run test:quiet         # Для ИИ агентов (минимум вывода)

# Валидация
npm run validate           # Полная проверка (lint + typecheck + test +
                           # test:smoke + cpd + validate:docs)
npm run validate:quiet     # Для ИИ агентов (минимум вывода)
npm run lint               # ESLint проверка
npm run lint:quiet         # Только ошибки
npm run typecheck          # TypeScript проверка типов
npm run cpd                # Проверка дублирования кода (<=5%)
npm run validate:tools     # Проверка регистрации tools/operations
npm run validate:docs      # Проверка лимитов размеров документации

# CLI утилиты
npm run mcp:connect        # Подключить сервер к MCP клиенту
npm run mcp:disconnect     # Отключить сервер
npm run mcp:list           # Список доступных клиентов
npm run mcp:status         # Статус подключения
```

### Добавление нового инструмента

**Пример:** добавим инструмент для получения спринтов.

1. **Создай структуру файлов:**
   ```
   src/tools/api/sprints/get/
   ├── get-sprints.schema.ts      # Zod схемы валидации
   ├── get-sprints.metadata.ts    # Метаданные (имя, категория, теги)
   ├── get-sprints.tool.ts        # Основной класс
   └── index.ts                   # Реэкспорт
   ```

2. **Добавь 1 строку регистрации:**
   ```typescript
   // src/composition-root/definitions/tool-definitions.ts
   import { GetSprintsTool } from '#tools/api/sprints/get/index.js';

   export const TOOL_CLASSES = [
     // ... существующие
     GetSprintsTool,  // <- ОДНА СТРОКА
   ] as const;
   ```

3. **Готово!** DI контейнер автоматически зарегистрирует инструмент.

**Подробнее:** [src/tools/README.md](src/tools/README.md)

### Технологический стек

- **TypeScript** (strict mode, без `any`)
- **InversifyJS v7** (Dependency Injection)
- **Zod** (валидация параметров)
- **Axios** (HTTP клиент, через @mcp-framework/infrastructure)
- **Pino** (структурированное логирование с ротацией)
- **Vitest** (тесты, покрытие >=80%)
- **MCP SDK** (Model Context Protocol)

---

## Документация

### Для разработчиков

- **[CLAUDE.md](./CLAUDE.md)** — правила для ИИ агентов и разработчиков
- **[src/tools/README.md](src/tools/README.md)** — добавление MCP инструментов
- **[src/tracker_api/api_operations/README.md](src/tracker_api/api_operations/README.md)** — API операции
- **[src/tracker_api/entities/README.md](src/tracker_api/entities/README.md)** — domain entities
- **[src/tracker_api/dto/README.md](src/tracker_api/dto/README.md)** — Data Transfer Objects
- **[src/tracker_api/facade/README.md](src/tracker_api/facade/README.md)** — Facade паттерн
- **[src/cli/README.md](src/cli/README.md)** — CLI утилиты подключения
- **[tests/README.md](tests/README.md)** — тестирование

### Monorepo

- **[Корневой README](../../README.md)** — обзор monorepo
- **[ARCHITECTURE.md](../../ARCHITECTURE.md)** — архитектура
- **[.github/CONTRIBUTING.md](../../.github/CONTRIBUTING.md)** — вклад в проект

---

## Совместимость

- **Платформы:** macOS, Linux, Windows
- **Node.js:** >= 22.0.0
- **MCP клиенты:** Claude Desktop >= 0.10.0
- **Яндекс.Трекер API:** v3

---

## Лицензия

MIT License — свободное использование, модификация и распространение.

См. [../../LICENSE](../../LICENSE)

---

## Полезные ссылки

- **GitHub:** https://github.com/FractalizeR/mcp_server_yandex_tracker
- **Releases:** https://github.com/FractalizeR/mcp_server_yandex_tracker/releases
- **Issues:** https://github.com/FractalizeR/mcp_server_yandex_tracker/issues
- **MCP Framework пакеты:**
  - [Infrastructure](../../framework/infrastructure/README.md)
  - [Core](../../framework/core/README.md)
  - [Search](../../framework/search/README.md)
- **API Яндекс.Трекера:** https://cloud.yandex.ru/docs/tracker/about-api
- **OAuth Яндекс:** https://yandex.ru/dev/oauth/

---

## Поддержка

**Нашел баг или есть вопрос?**
1. Проверь раздел [Устранение проблем](#устранение-проблем)
2. Посмотри [Issues на GitHub](https://github.com/FractalizeR/mcp_server_yandex_tracker/issues)
3. Создай новый Issue с описанием проблемы

**Хочешь помочь проекту?**
- Поставь звезду на GitHub
- Сообщи о баге
- Предложи новую фичу
- Сделай Pull Request

---

<div align="center">

**Сделано с любовью для MCP сообщества**

[Наверх](#яндекстрекер-для-claude-desktop)

</div>
