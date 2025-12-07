# Yandex Wiki CLI

CLI для управления подключениями Yandex Wiki MCP Server к AI клиентам.

Построен на базе `@mcp-framework/cli`.

---

## Использование

```bash
npm run mcp:connect      # Подключить к клиенту
npm run mcp:disconnect   # Отключить от клиента
npm run mcp:status       # Статус подключений
npm run mcp:list         # Список поддерживаемых клиентов
npm run mcp:validate     # Проверить валидность конфигураций
```

**Поддерживаемые клиенты:**
- Claude Desktop
- Claude Code
- Codex
- Gemini (Google AI Studio)
- Qwen (Alibaba Cloud)

---

## Структура

```
src/cli/
├── bin/
│   └── mcp-connect.ts    # CLI entry point
├── types.ts              # YandexWikiMCPConfig
├── prompts.ts            # Конфигурация промптов
└── README.md             # Эта документация
```

---

## Конфигурация

| Поле | Тип | Описание | Сохраняется? |
|------|-----|----------|--------------|
| `token` | `string` | OAuth токен | Секрет |
| `orgId` | `string` | ID организации | Да |
| `logLevel` | `LogLevel?` | Уровень логирования | Да |

---

## Дополнительная документация

- **Framework CLI:** [packages/framework/cli/README.md](../../../framework/cli/README.md)
- **Yandex Wiki Server:** [packages/servers/yandex-wiki/README.md](../../README.md)
