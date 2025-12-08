# Чеклист разработки MCP сервера

**Reference implementation:** [packages/servers/yandex-tracker](packages/servers/yandex-tracker/)

---

## 1. Структура проекта

### 1.1 Обязательные директории
- [ ] `src/` — исходный код
- [ ] `src/index.ts` — главная точка входа MCP сервера
- [ ] `src/config/` — загрузка конфигурации из ENV
- [ ] `src/cli/` — CLI для подключения к MCP клиентам
- [ ] `src/composition-root/` — DI контейнер (InversifyJS)
- [ ] `src/tools/` — MCP инструменты
- [ ] `src/common/schemas/` — переиспользуемые Zod схемы
- [ ] `tests/` — тесты (зеркально `src/`)
- [ ] `tests/smoke/` — smoke тесты

### 1.2 Entry Point (src/index.ts) — КРИТИЧНО!
```typescript
// В конце файла ОБЯЗАТЕЛЬНО должен быть вызов main():
export { main };

// Запуск сервера
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
```

**⚠️ ТИПИЧНАЯ ОШИБКА:** Экспорт `main` без вызова → сервер не запускается!

### 1.3 Конфигурация package.json
```json
{
  "bin": {
    "mcp-server-{name}": "./dist/index.js",
    "mcp-connect": "./dist/cli/bin/mcp-connect.js"
  },
  "scripts": {
    "test:smoke": "vitest run tests/smoke",
    "test:smoke:server": "tsx scripts/smoke-test-server.ts",
    "validate": "npm run lint && npm run typecheck && npm run test && npm run test:smoke && npm run test:smoke:server"
  }
}
```

**Два типа smoke тестов (обязательно оба):**
- `test:smoke` — vitest тесты для проверки DI, lifecycle, definition generation
- `test:smoke:server` — запуск реального процесса + JSON-RPC проверка

---

## 2. MCP Tools

### 2.1 Структура tool (3 файла на каждый)
- [ ] `{tool-name}.schema.ts` — Zod schema (единственный источник истины)
- [ ] `{tool-name}.metadata.ts` — статические метаданные для поиска
- [ ] `{tool-name}.tool.ts` — класс tool (extends BaseTool)
- [ ] `index.ts` — реэкспорты

### 2.2 Schema файл (обязательно)
```typescript
export const GetResourceParamsSchema = z.object({
  resourceId: z.string().min(1).describe('ID ресурса'),
  fields: FieldsSchema,  // ОБЯЗАТЕЛЬНО для read операций!
});
```

### 2.3 Metadata файл (обязательно)
```typescript
export const GET_RESOURCE_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_resource', MCP_TOOL_PREFIX),
  description: '[Category/Read] Описание инструмента',
  category: ToolCategory.RESOURCES,  // ОБЯЗАТЕЛЬНО!
  subcategory: 'read',               // Рекомендуется
  priority: ToolPriority.NORMAL,
  tags: ['resource', 'read', 'get'],
  isHelper: false,
  requiresExplicitUserConsent: false,  // true для write/delete
} as const;
```

### 2.4 Tool класс (обязательно)
```typescript
export class GetResourceTool extends BaseTool<Facade> {
  static override readonly METADATA = GET_RESOURCE_TOOL_METADATA;

  protected override getParamsSchema() {
    return GetResourceParamsSchema;  // Автогенерация MCP definition!
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetResourceParamsSchema);
    if (!validation.success) return validation.error;
    // ... логика
  }
}
```

---

## 3. Фильтрация полей (КРИТИЧНО!)

### 3.1 FieldsSchema в каждом read tool
```typescript
// В schema файле
fields: FieldsSchema,  // ОБЯЗАТЕЛЬНЫЙ параметр
```

### 3.2 Фильтрация перед возвратом
```typescript
// В tool.execute()
const filtered = ResponseFieldFilter.filter(data, fields);
return this.formatSuccess({
  resource: filtered,
  fieldsReturned: fields,  // ВСЕГДА возвращаем какие поля вернули
});
```

### 3.3 Зачем это нужно
- Экономия контекста MCP на **80-90%**
- API может возвращать 50-100 полей, ИИ агенту нужны 3-10

---

## 4. Группировка инструментов

### 4.1 Обязательные категории
- [ ] Каждый tool ОБЯЗАН иметь `category` в METADATA
- [ ] Используй `ToolCategory` enum из `@mcp-framework/core`

### 4.2 Поддержка DISABLED_TOOL_GROUPS
В `config-loader.ts`:
```typescript
function parseDisabledToolGroups(value: string | undefined): ParsedCategoryFilter | undefined
```

### 4.3 ENV переменные для фильтрации
```bash
DISABLED_TOOL_GROUPS="helpers:gtd,tasks:date"
TOOL_DISCOVERY_MODE="eager"  # или "lazy"
```

---

## 5. DI и регистрация

### 5.1 composition-root/ структура
- [ ] `container.ts` — конфигурация контейнера
- [ ] `types.ts` — DI токены (автогенерация из definitions)
- [ ] `validation.ts` — проверка уникальности имён
- [ ] `definitions/tool-definitions.ts` — массив Tool классов
- [ ] `definitions/operation-definitions.ts` — массив Operation классов

### 5.2 Регистрация tool (1 строка!)
```typescript
// definitions/tool-definitions.ts
export const TOOL_CLASSES = [
  PingTool,
  GetResourceTool,  // Добавил одну строку — tool зарегистрирован!
  // ...
] as const;
```

### 5.3 Автогенерация DI символов
```typescript
// types.ts (автоматически!)
export const TOOL_SYMBOLS = TOOL_CLASSES.reduce((acc, ToolClass) => {
  acc[ToolClass.name] = Symbol.for(`tool:${ToolClass.name}`);
  return acc;
}, {});
```

---

## 6. Smoke тесты (КРИТИЧНО!)

### 6.1 Минимальный набор (ОБЯЗАТЕЛЬНО)
- [ ] `mcp-server-lifecycle.smoke.test.ts` — сервер создаётся без ошибок
- [ ] `di-container.smoke.test.ts` — DI контейнер инициализируется

### 6.2 Рекомендуемые smoke тесты
- [ ] `e2e-tool-execution.smoke.test.ts` — tool выполняется end-to-end
- [ ] `definition-generation.smoke.test.ts` — все tools генерируют валидный definition
- [ ] `scripts/smoke-test-server.ts` — запуск реального процесса + JSON-RPC

### 6.3 Что проверять в smoke тестах

**MCP Lifecycle:**
- [ ] Создание Server instance без ошибок
- [ ] Инициализация DI контейнера
- [ ] Получение ToolRegistry
- [ ] Режимы: lazy и eager discovery

**DI Container:**
- [ ] Logger резолвится
- [ ] HttpClient резолвится
- [ ] Facade резолвится
- [ ] ToolRegistry резолвится
- [ ] Singleton instances (одинаковые при повторном резолвинге)

**Definition Generation:**
- [ ] Все tools генерируют definition
- [ ] properties имеют type
- [ ] required поля существуют в properties
- [ ] Tool names соответствуют `^[a-z0-9_-]+$`

**Server Startup (script):**
- [ ] Запуск процесса с fake credentials
- [ ] JSON-RPC запрос `tools/list`
- [ ] Минимум N инструментов (≥10)
- [ ] Критический tool присутствует (ping)
- [ ] Graceful shutdown

### 6.4 Интеграция smoke тестов в validate
```json
{
  "scripts": {
    "validate": "npm run lint && npm run typecheck && npm run test && npm run test:smoke"
  }
}
```

---

## 7. CLI (mcp-connect)

### 7.1 Структура CLI
- [ ] `src/cli/bin/mcp-connect.ts` — entry point
- [ ] `src/cli/types.ts` — тип конфигурации сервера
- [ ] `src/cli/prompts.ts` — настройка промптов

### 7.2 Поддерживаемые клиенты
- Claude Desktop (JSON config)
- Claude Code (CLI команды)
- Codex (TOML config)
- Gemini (JSON config)
- Qwen (JSON config)

### 7.3 Безопасность секретов
```typescript
const configManager = new ConfigManager({
  projectName: 'my-mcp-server',
  safeFields: ['orgId', 'logLevel'],  // token НЕ указан — не сохраняется!
});
```

---

## 8. Тестирование

### 8.1 Структура тестов
```
tests/
├── smoke/              # Smoke тесты (ОБЯЗАТЕЛЬНО!)
├── tools/              # Unit тесты tools
├── integration/        # Integration тесты с mock API
├── composition-root/   # DI тесты
└── helpers/            # Test utilities
```

### 8.2 Минимальное покрытие
- Lines: 90%
- Functions: 90%
- Branches: 85%

---

## 9. Валидация перед релизом

### 9.1 Команда validate
```bash
npm run validate  # lint + typecheck + test + test:smoke
```

### 9.2 Чеклист перед коммитом
- [ ] `npm run build` — успешная сборка
- [ ] `npm run validate` — все проверки пройдены
- [ ] `npm run test:smoke` — smoke тесты проходят
- [ ] Новые tools добавлены в `tool-definitions.ts`
- [ ] Новые tools имеют `category` в METADATA
- [ ] Read tools используют `FieldsSchema`
- [ ] Read tools фильтруют через `ResponseFieldFilter`

---

## 10. Типичные ошибки

### 10.1 MCP сервер не запускается
- [ ] Проверь `test:smoke` в `validate` скрипте
- [ ] Добавь `smoke-test-server.ts` скрипт
- [ ] Проверь что DI контейнер резолвит все зависимости

### 10.2 Контекст ИИ переполняется
- [ ] Добавь `FieldsSchema` в read tools
- [ ] Используй `ResponseFieldFilter.filter()`
- [ ] Возвращай `fieldsReturned` в ответе

### 10.3 Инструменты нельзя отключить
- [ ] Добавь `category` в каждый tool METADATA
- [ ] Реализуй парсинг `DISABLED_TOOL_GROUPS` в config-loader
- [ ] Используй `getDefinitionsByMode()` с фильтрами

### 10.4 Tool не появляется в списке
- [ ] Добавь класс в `tool-definitions.ts`
- [ ] Проверь что class имеет static `METADATA`
- [ ] Проверь что `getParamsSchema()` возвращает schema

---

## 11. Reference файлы

**Yandex Tracker (эталон):**
- [composition-root/container.ts](packages/servers/yandex-tracker/src/composition-root/container.ts)
- [tools/api/issues/get/](packages/servers/yandex-tracker/src/tools/api/issues/get/) — пример tool
- [tests/smoke/](packages/servers/yandex-tracker/tests/smoke/) — smoke тесты
- [scripts/smoke-test-server.ts](packages/servers/yandex-tracker/scripts/smoke-test-server.ts)

**Framework:**
- [core/src/tools/base/base-tool.ts](packages/framework/core/src/tools/base/base-tool.ts)
- [core/src/definition/schema-to-definition.ts](packages/framework/core/src/definition/schema-to-definition.ts)
- [core/src/utils/response-field-filter.ts](packages/framework/core/src/utils/response-field-filter.ts)
