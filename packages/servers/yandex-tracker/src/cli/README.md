# Yandex Tracker CLI

⚠️ **Migration in progress:** CLI использует `@mcp-framework/cli` с возможностью отката на legacy версию.

---

## 🎯 Назначение

**Адаптер для Yandex Tracker MCP Server** на базе `@mcp-framework/cli`.

Обеспечивает подключение к MCP клиентам (Claude Desktop, Claude Code, Codex, Gemini, Qwen) через переиспользуемый CLI framework.

---

## 🚀 Использование

```bash
# Новая версия (default)
npm run mcp:connect

# Legacy версия (если нужно)
USE_FRAMEWORK_CLI=false npm run mcp:connect
```

**Доступные команды:**
- `connect` — Подключить MCP сервер к клиенту
- `disconnect` — Отключить MCP сервер от клиента
- `status` — Проверить статус подключений
- `list` — Показать список поддерживаемых клиентов
- `validate` — Проверить валидность конфигураций

---

## 📁 Структура

```
src/cli/
├── bin/
│   ├── mcp-connect.ts              # Router с feature flag
│   └── mcp-connect-framework.ts    # Framework-based CLI
├── types.ts                         # YandexTrackerMCPConfig
├── prompts.ts                       # Конфигурация промптов
├── feature-flags.ts                 # Feature flags для миграции
└── README.md                        # Эта документация
```

**Legacy код сохранен в:**
```
src/cli-legacy/                      # Старый CLI (для rollback)
├── bin/mcp-connect.ts
├── connectors/
├── commands/
└── utils/
```

---

## ⚙️ Конфигурация

Yandex Tracker требует следующие поля:

| Поле | Тип | Описание | Сохраняется? |
|------|-----|----------|--------------|
| `token` | `string` | OAuth токен | ❌ Секрет (не сохраняется) |
| `orgId` | `string` | ID организации | ✅ Да |
| `apiBase` | `string?` | URL API (опционально) | ✅ Да |
| `logLevel` | `LogLevel?` | Уровень логирования | ✅ Да |

**Подробности:** `src/cli/types.ts` и `src/cli/prompts.ts`

---

## 🔧 Архитектура

Новый CLI построен на **@mcp-framework/cli** — переиспользуемом framework для всех MCP серверов.

**Преимущества:**
- ✅ Меньше кода (80-90% переехал в framework)
- ✅ Единообразная логика для всех MCP серверов
- ✅ Централизованные исправления багов
- ✅ Расширяемость (новые клиенты добавляются в framework)

**Framework пакет:** [packages/framework/cli/README.md](../../../framework/cli/README.md)

---

## 🚨 Feature Flags

### USE_FRAMEWORK_CLI

Переключение между framework и legacy CLI:

```bash
# Использовать framework CLI (по умолчанию)
npm run mcp:connect

# Откат на legacy CLI
USE_FRAMEWORK_CLI=false npm run mcp:connect
```

### DEBUG_CLI_MIGRATION

Отладка миграции:

```bash
# Включить debug логи
DEBUG_CLI_MIGRATION=true npm run mcp:connect
```

**Подробности:** `src/cli/feature-flags.ts`

---

## 🔄 Rollback

При проблемах с новым CLI:

```bash
# Временно вернуться на legacy версию
USE_FRAMEWORK_CLI=false npm run mcp:connect
```

**Время отката:** ~5 секунд (без изменения кода)

---

## 📚 Дополнительная документация

- **Framework CLI:** [packages/framework/cli/README.md](../../../framework/cli/README.md)
- **План миграции:** [.agentic-planning/plan_cli_framework_extraction/](../../../.agentic-planning/plan_cli_framework_extraction/)
- **Legacy код:** [src/cli-legacy/](../cli-legacy/)

---

## ℹ️ Статус

**Текущая версия:** Framework-based CLI с legacy fallback
**Legacy код:** Сохранен в `cli-legacy/` для rollback
**Планируемое удаление legacy:** После 2-4 недель успешной работы (этап 8.1)
