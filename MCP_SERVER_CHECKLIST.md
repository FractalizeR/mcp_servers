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
- [ ] `tests/helpers/` — test utilities и fixtures
- [ ] `scripts/` — служебные скрипты

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
    "mcp-server-{name}": "./dist/{name}.bundle.cjs",
    "mcp-connect": "./dist/cli/bin/mcp-connect.js"
  },
  "scripts": {
    "prebuild": "npm run generate:index",
    "build": "tsc -b && tsc-alias && npm run build:bundle",
    "build:bundle": "tsx ../scripts/increment-build.ts && tsup",
    "generate:index": "tsx scripts/generate-tool-index.ts",
    "test:smoke": "vitest run tests/smoke",
    "test:smoke:server": "tsx scripts/smoke-test-server.ts",
    "validate": "npm run lint && npm run typecheck && npm run test && npm run test:smoke && npm run test:smoke:server && npm run cpd && npm run depcruise && npm run validate:docs",
    "validate:tools": "tsx scripts/validate-tool-registration.ts"
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

### 6.1 Обязательный набор (ВСЕ 5 тестов!)
- [ ] `mcp-server-lifecycle.smoke.test.ts` — сервер создаётся без ошибок
- [ ] `di-container.smoke.test.ts` — DI контейнер инициализируется
- [ ] `definition-generation.smoke.test.ts` — все tools генерируют валидный definition
- [ ] `e2e-tool-execution.smoke.test.ts` — tool выполняется end-to-end с mock
- [ ] `tool-search.smoke.test.ts` — поиск инструментов работает

### 6.2 Обязательный скрипт
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

**E2E Tool Execution:**
- [ ] ping tool зарегистрирован и выполняется
- [ ] Mock HttpClient работает
- [ ] Tool metadata корректно возвращается
- [ ] Обработка ошибок HTTP клиента

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
    "validate": "npm run lint && npm run typecheck && npm run test && npm run test:smoke && npm run test:smoke:server"
  }
}
```

---

## 7. Служебные скрипты (ОБЯЗАТЕЛЬНО!)

### 7.1 Минимальный набор скриптов
- [ ] `scripts/smoke-test-server.ts` — JSON-RPC smoke тест
- [ ] `scripts/generate-tool-index.ts` — автогенерация `generated-index.ts`
- [ ] `scripts/validate-tool-registration.ts` — проверка регистрации tools

### 7.2 Тестовые хелперы
- [ ] `tests/helpers/mock-factories.ts` — фабрики моков
- [ ] `tests/helpers/schema-definition-matcher.ts` — валидация схем

### 7.3 generate-tool-index.ts
Автоматически сканирует `src/tools/` и генерирует:
```typescript
// generated-index.ts
export { GetIssueTool } from './api/issues/get/get-issue.tool.js';
export { CreateIssueTool } from './api/issues/create/create-issue.tool.js';
// ... все tools автоматически
```

### 7.4 validate-tool-registration.ts
Проверяет что все tools:
- Добавлены в `TOOL_CLASSES`
- Имеют корректный `METADATA`
- Имеют метод `getParamsSchema()`

---

## 8. Архитектура Facade → Services → Operations

### 8.1 Рекомендуемая архитектура (как в yandex-tracker)
```
Facade (entry point)
   ↓
Services (доменная логика, batch операции)
   ↓
Operations (HTTP вызовы API)
```

### 8.2 Facade Services (рекомендуется)
```typescript
// facade/services/issue.service.ts
@injectable()
export class IssueService {
  constructor(
    @inject(GetIssueOperation) private getIssue: GetIssueOperation,
    @inject(CreateIssueOperation) private createIssue: CreateIssueOperation,
  ) {}

  async getBatch(issueIds: string[]): Promise<BatchResult[]> {
    return Promise.all(issueIds.map(id => this.getIssue.execute(id)));
  }
}
```

### 8.3 Facade делегирует сервисам
```typescript
// facade/my-api.facade.ts
@injectable()
export class MyApiFacade {
  constructor(
    @inject(IssueService) private issueService: IssueService,
    @inject(CommentService) private commentService: CommentService,
  ) {}

  get issues() { return this.issueService; }
  get comments() { return this.commentService; }
}
```

---

## 9. CLI (mcp-connect)

### 9.1 Структура CLI
- [ ] `src/cli/bin/mcp-connect.ts` — entry point
- [ ] `src/cli/types.ts` — тип конфигурации сервера
- [ ] `src/cli/prompts.ts` — настройка промптов

### 9.2 Поддерживаемые клиенты
- Claude Desktop (JSON config)
- Claude Code (CLI команды)
- Codex (TOML config)
- Gemini (JSON config)
- Qwen (JSON config)

### 9.3 Безопасность секретов
```typescript
const configManager = new ConfigManager({
  projectName: 'my-mcp-server',
  safeFields: ['orgId', 'logLevel'],  // token НЕ указан — не сохраняется!
});
```

---

## 10. Тестирование

### 10.1 Структура тестов
```
tests/
├── smoke/              # Smoke тесты (ОБЯЗАТЕЛЬНО 5 файлов!)
├── tools/              # Unit тесты tools
├── integration/        # Integration тесты с mock API
├── composition-root/   # DI тесты
├── helpers/            # Test utilities и fixtures
├── workflows/          # E2E workflow тесты (рекомендуется)
└── mcp/                # MCP-специфичные тесты
```

### 10.2 Целевое покрытие
Пороги настроены в `vitest.config.ts`:
- Lines: 90%
- Functions: 90%
- Branches: 85%
- Statements: 90%

**⚠️ ВАЖНО:** Достижение этих порогов обязательно для релиза!

### 10.3 Обязательные тестовые хелперы
```typescript
// tests/helpers/schema-definition-matcher.ts
export function validateGeneratedDefinition(inputSchema: object): void {
  // Проверяет структуру JSON Schema
}

// tests/helpers/mock-factories.ts
export function createMockFacade(): MockedFacade { ... }
export function createMockLogger(): MockedLogger { ... }
```

---

## 11. Валидация перед релизом

### 11.1 Команда validate
```bash
npm run validate  # lint + typecheck + test + test:smoke + cpd + depcruise + validate:docs
```

### 11.2 Чеклист перед коммитом
- [ ] `npm run build` — успешная сборка
- [ ] `npm run validate` — все проверки пройдены
- [ ] `npm run test:smoke` — все 5 smoke тестов проходят
- [ ] `npm run test:smoke:server` — JSON-RPC тест проходит
- [ ] `npm run test:coverage` — покрытие достигает порогов
- [ ] Новые tools добавлены в `tool-definitions.ts`
- [ ] Новые tools имеют `category` в METADATA
- [ ] Read tools используют `FieldsSchema`
- [ ] Read tools фильтруют через `ResponseFieldFilter`

---

## 12. Типичные ошибки

### 12.1 MCP сервер не запускается
- [ ] Проверь вызов `main()` в `index.ts`
- [ ] Проверь `test:smoke:server` в `validate` скрипте
- [ ] Добавь `smoke-test-server.ts` скрипт
- [ ] Проверь что DI контейнер резолвит все зависимости

### 12.2 Контекст ИИ переполняется
- [ ] Добавь `FieldsSchema` в read tools
- [ ] Используй `ResponseFieldFilter.filter()`
- [ ] Возвращай `fieldsReturned` в ответе

### 12.3 Инструменты нельзя отключить
- [ ] Добавь `category` в каждый tool METADATA
- [ ] Реализуй парсинг `DISABLED_TOOL_GROUPS` в config-loader
- [ ] Используй `getDefinitionsByMode()` с фильтрами

### 12.4 Tool не появляется в списке
- [ ] Добавь класс в `tool-definitions.ts`
- [ ] Проверь что class имеет static `METADATA`
- [ ] Проверь что `getParamsSchema()` возвращает schema
- [ ] Запусти `npm run validate:tools` для диагностики

### 12.5 Покрытие не достигает порогов
- [ ] Добавь unit тесты для всех tools
- [ ] Добавь unit тесты для всех operations
- [ ] Добавь integration тесты с mock API
- [ ] Проверь покрытие facade/services

---

## 13. Reference файлы

**Yandex Tracker (эталон):**
- [composition-root/container.ts](packages/servers/yandex-tracker/src/composition-root/container.ts)
- [tools/api/issues/get/](packages/servers/yandex-tracker/src/tools/api/issues/get/) — пример tool
- [tests/smoke/](packages/servers/yandex-tracker/tests/smoke/) — все 5 smoke тестов
- [tests/helpers/](packages/servers/yandex-tracker/tests/helpers/) — mock factories и fixtures
- [scripts/](packages/servers/yandex-tracker/scripts/) — все служебные скрипты

**Framework:**
- [core/src/tools/base/base-tool.ts](packages/framework/core/src/tools/base/base-tool.ts)
- [core/src/definition/schema-to-definition.ts](packages/framework/core/src/definition/schema-to-definition.ts)
- [core/src/utils/response-field-filter.ts](packages/framework/core/src/utils/response-field-filter.ts)
