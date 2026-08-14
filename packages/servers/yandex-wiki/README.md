# MCP Server for Yandex Wiki

MCP сервер для работы с API Yandex Wiki.

## Установка

### Способ 1: npm (глобальная установка)

```bash
npm install -g @fractalizer/mcp-server-yandex-wiki
```

После установки доступен бинарь `mcp-wiki-connect` для подключения к MCP-клиентам
(см. раздел [Через CLI](#через-cli-рекомендуется)).

### Способ 2: Из исходников (для разработчиков)

```bash
git clone https://github.com/FractalizeR/mcp_servers.git
cd mcp_servers
npm install && npm run build

# Подключить к MCP клиенту интерактивно
cd packages/servers/yandex-wiki
npm run mcp:connect
```

## Конфигурация

### Обязательные переменные окружения

| Переменная | Описание |
|------------|----------|
| `YANDEX_WIKI_TOKEN` | OAuth токен для Wiki API |
| `YANDEX_ORG_ID` | ID организации (Яндекс 360) |

Или для Yandex Cloud:

| Переменная | Описание |
|------------|----------|
| `YANDEX_WIKI_TOKEN` | OAuth токен |
| `YANDEX_CLOUD_ORG_ID` | ID организации (Cloud) |

### Опциональные переменные

| Переменная | Default | Описание |
|------------|---------|----------|
| `LOG_LEVEL` | `info` | Уровень логирования |
| `REQUEST_TIMEOUT` | `30000` | Таймаут запросов (мс) |
| `YANDEX_WIKI_RETRY_ATTEMPTS` | `3` | Количество retry попыток |
| `DISABLED_TOOL_GROUPS` | - | Отключение групп инструментов |

### Фильтрация инструментов

Используйте `DISABLED_TOOL_GROUPS` для отключения категорий или подкатегорий инструментов:

```bash
# Отключить целые категории
DISABLED_TOOL_GROUPS="grids"

# Отключить подкатегории
DISABLED_TOOL_GROUPS="pages:delete,grids:update"

# Смешанный формат
DISABLED_TOOL_GROUPS="grids,pages:delete"
```

## Использование

### Через CLI (рекомендуется)

CLI автоматически прописывает конфигурацию сервера в выбранный MCP-клиент —
не нужно вручную редактировать JSON-файлы.

**Поддерживаемые клиенты:** Claude Desktop, Claude Code, Codex, Gemini, Qwen.

```bash
# Глобальная установка — используй бинарь mcp-wiki-connect
mcp-wiki-connect connect                    # интерактивный выбор клиента
mcp-wiki-connect connect --client claude-code
mcp-wiki-connect status                     # статус подключений
mcp-wiki-connect doctor                     # диагностика сломанных конфигов
mcp-wiki-connect disconnect                 # отключить сервер
```

Из исходников те же команды доступны через npm-скрипты:

```bash
npm run mcp:connect        # подключить сервер к MCP клиенту
npm run mcp:disconnect     # отключить сервер
npm run mcp:status         # статус подключений
npm run mcp:list           # список поддерживаемых клиентов
```

При подключении CLI интерактивно запросит OAuth токен и ID организации
(`YANDEX_ORG_ID` для Яндекс 360 или `YANDEX_CLOUD_ORG_ID` для Yandex Cloud).

### С Claude Desktop

Добавьте в `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "yandex-wiki": {
      "command": "npx",
      "args": ["-y", "@fractalizer/mcp-server-yandex-wiki"],
      "env": {
        "YANDEX_WIKI_TOKEN": "your-token",
        "YANDEX_ORG_ID": "your-org-id"
      }
    }
  }
}
```

## Доступные инструменты

### Pages API

| Tool | Описание |
|------|----------|
| `yw_get_page` | Получить страницу по slug |
| `yw_get_page_by_id` | Получить страницу по ID |
| `yw_create_page` | Создать страницу |
| `yw_update_page` | Обновить страницу |
| `yw_delete_page` | Удалить страницу |
| `yw_clone_page` | Клонировать страницу |
| `yw_append_content` | Добавить контент к странице |
| `yw_diff_page` | Сравнить страницу с предлагаемым содержимым (read-only, ничего не сохраняет) |

### Helpers

| Tool | Описание |
|------|----------|
| `yw_ping` | Проверка подключения |

## Примеры использования

### Получить страницу

```
yw_get_page(slug: "users/docs/readme", fields: "attributes,content")
```

### Создать страницу

```
yw_create_page(
  page_type: "page",
  slug: "users/docs/new-page",
  title: "New Page",
  content: "# Hello World\n\nThis is a new page."
)
```

### Обновить страницу

```
yw_update_page(
  idx: 12345,
  content: "# Updated Content"
)
```

### Клонировать страницу

```
yw_clone_page(
  idx: 12345,
  target: "users/docs/cloned-page",
  title: "Cloned Page",
  recursive: true
)
```

## API Reference

- Base URL: `https://api.wiki.yandex.net/v1/`
- Документация API: https://yandex.ru/support/wiki/ru/api-ref/

## Структура проекта

```
src/
├── config/         # Конфигурация и загрузка env
├── wiki_api/       # Интеграция с Wiki API
│   ├── api_operations/  # HTTP операции
│   ├── entities/        # Типы данных
│   ├── dto/             # Request DTOs
│   └── facade/          # Facade + Services
├── tools/          # MCP Tools
│   ├── api/pages/  # Page tools
│   └── helpers/    # Utility tools
└── composition-root/    # DI контейнер
```

## License

PolyForm Shield License 1.0.0
