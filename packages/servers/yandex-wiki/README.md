# MCP Server for Yandex Wiki

MCP сервер для работы с API Yandex Wiki.

## Установка

```bash
npm install mcp-server-yandex-wiki
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

### С Claude Desktop

Добавьте в `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "yandex-wiki": {
      "command": "npx",
      "args": ["mcp-server-yandex-wiki"],
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

MIT
