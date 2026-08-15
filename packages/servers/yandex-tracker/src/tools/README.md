# MCP Tools — Yandex Tracker Конвенции

**Разработка MCP tools для Yandex.Tracker сервера**

---

## 🎯 Назначение

**MCP Tools** — это набор инструментов, которые Claude использует для взаимодействия с Яндекс.Трекер API.

**Текущая структура:**
- **API Tools** — работа с Яндекс.Трекер (задачи, проекты, комментарии, работа с очередями)
- **Helper Tools** — вспомогательные утилиты (ping, demo, issue-url)

**Слоистая архитектура:**
```
MCP Tool → YandexTrackerFacade → API Operation → HttpClient → Яндекс.Трекер API
```

---

## 📁 Структура

```
src/tools/
├── api/                          # API tools (работа с Tracker)
│   ├── issues/
│   │   ├── get/
│   │   │   ├── get-issues.schema.ts   # Zod schema (источник истины)
│   │   │   └── get-issues.tool.ts     # Tool (definition автогенерируется)
│   │   ├── create/
│   │   ├── update/
│   │   ├── links/                # Связи между задачами
│   │   ├── comments/             # Комментарии к задачами
│   │   └── attachments/          # Файловые вложения
│   │       ├── get/
│   │       ├── upload/
│   │       ├── download/
│   │       ├── delete/
│   │       └── thumbnail/
│   ├── projects/
│   └── queues/
├── helpers/                      # Вспомогательные tools
│   ├── demo/
│   └── issue-url/
└── ping.tool.ts                  # Корневой ping tool (System/Health, не helper)
```

---

## 🚨 КРИТИЧЕСКИЕ ПРАВИЛА

### 1. Используй Facade, НЕ Operations напрямую

**❌ ЗАПРЕЩЕНО:**
```typescript
constructor(
  private getIssuesOp: GetIssuesOperation  // WRONG!
) {}
```

**✅ ПРАВИЛЬНО:**
```typescript
constructor(
  private trackerFacade: YandexTrackerFacade
) {}

execute() {
  const results = await this.trackerFacade.getIssues(keys);
}
```

**Причина:** Facade инкапсулирует бизнес-логику, может объединять несколько операций, легче тестировать

---

### 2. Обязательные компоненты Tool

**Каждый tool ДОЛЖЕН иметь:**

1. **Static METADATA** — категоризация и сортировка в `tools/list`
```typescript
static readonly METADATA: ToolMetadata = {
  name: 'get_issues',
  description: '[Issues/Read] Получить задачи по ключам',
  category: 'issues',              // ОБЯЗАТЕЛЬНО
  subcategory: 'read',             // Опционально (read/write/workflow)
  priority: 'critical',            // Опционально (critical/high/normal/low)
  tags: ['issues', 'read', 'get'], // Опционально
  inputSchema: {...}
};
```

2. **Zod Schema** — валидация параметров (источник истины!)
```typescript
const GetIssuesParamsSchema = z.object({
  keys: z.array(z.string()).min(1).max(200).describe('Массив ключей задач'),
  fields: FieldsSchema.optional().describe('Список возвращаемых полей'),
  expand: ExpandSchema.optional().describe('Дополнительные связанные объекты'),
});
```

3. **Auto-generated Definition** — генерируется из schema
```typescript
getDefinition(): ToolDefinition {
  return generateDefinitionFromSchema(this.metadata, GetIssuesParamsSchema);
}
```

**❌ Устарело:** Отдельные `*.definition.ts` файлы (удалены)

4. **Response Field Filter** — экономия токенов (80-90%)
```typescript
const filtered = ResponseFieldFilter.filter(data, params.fields);
return this.formatSuccess({ issues: filtered });
```

---

## 🏷️ Категоризация инструментов

**Обязательные метаданные:**
- `category` — основная категория (issues, helpers, system)
- `subcategory` — read/write/workflow/… (опционально). **Правило:** у ЛЮБОГО инструмента,
  удаляющего сущность (`delete_*`), `subcategory: 'delete'` — независимо от домена
  (даже если соседние read/write-операции того же домена сгруппированы под другим
  именем, напр. `attachments`/`worklog`/`links`). Это единственный способ выключить
  все удаляющие инструменты одним правилом `DISABLED_TOOL_GROUPS`.
- `priority` — critical/high/normal/low (опционально, default: normal); определяет порядок в `tools/list`
- `tags` — для категоризации (опционально)

**Description формат:** `[Category/Subcategory] Краткое описание` (≤80 символов)

---

## 🔄 Schema → Definition (Автогенерация)

**Принцип:** Zod schema = единственный источник истины для MCP definition.

**Структура файлов:**
```
{feature}/{action}/
├── {name}.schema.ts   # Zod schema с .describe()
└── {name}.tool.ts     # Tool с автогенерацией
```

**Tool использует `generateDefinitionFromSchema(metadata, schema)` вместо отдельных `*.definition.ts` (удалены).**

**Детали:** См. [Core Framework README](../../../../framework/core/README.md) и [ARCHITECTURE.md](../../../../../ARCHITECTURE.md)

---

## 📏 Целевые метрики для Tool Descriptions

**Измерение:** `npx tsx scripts/measure-descriptions.ts`

### METADATA.description (короткие для discovery)
- **Формат:** `[Category/Subcategory] Краткое описание`
- **Лимит:** ≤80 символов
- **Target total:** ~400 tokens для всех 41 tools

### ToolDefinition.description (полные для MCP)
- **Target per tool:** ~110 tokens (~440 chars)
- **Maximum per tool:** ~150 tokens (~600 chars)
- **Target total:** ≤4,500 tokens (~18,000 chars) для всех 41 tools

**Current metrics (после оптимизации):**
```
METADATA.description: 408 tokens ✅
ToolDefinition.description: 4,470 tokens ✅
Average per tool: 110 tokens ✅
```

**Guidelines для buildDescription():**
- Используй активные глаголы (Создаёт, Обновляет, Получает, Удаляет)
- Обязательные поля отмечай звездочкой: `(field1*, field2*, optional)`
- Ссылки на альтернативы: `Для X: tool_name`
- Избегай многословных паттернов "Для:/Не для:"
- Сохраняй важные предупреждения (⚠️)

---

### 3. Флаг безопасности `requiresExplicitUserConsent`

**⚠️ Если tool ИЗМЕНЯЕТ данные:**
```typescript
static readonly METADATA: StaticToolMetadata = {
  name: 'fyt_mcp_update_issue',
  requiresExplicitUserConsent: true,  // ⚠️ ОБЯЗАТЕЛЬНО
};
```

**✅ Если tool только ЧИТАЕТ:**
```typescript
static readonly METADATA: StaticToolMetadata = {
  name: 'fyt_mcp_get_issues',
  // requiresExplicitUserConsent отсутствует (или false)
};
```

**Проверка:** `npm run validate:tools`

**Опасные операции:** `update`, `create`, `delete`, `transition`, `execute`
**Безопасные операции:** `get`, `find`, `search`, `list`, `ping`

---

### 4. Batch-операции

**✅ Используй BatchResultProcessor для обработки:**
```typescript
const processed = BatchResultProcessor.process(
  results,
  (item) => ResponseFieldFilter.filter(item, params.fields)
);

// Структура:
// { successful: [{ key, data }], failed: [{ key, error }] }
```

**✅ Логируй результаты через ResultLogger:**
```typescript
ResultLogger.logBatchSuccess(this.logger, 'get_issues', {
  totalRequested: keys.length,
  successful: processed.successful.length,
  failed: processed.failed.length,
});
```

---

### 5. Обязательный параметр `fields`

**❌ ЗАПРЕЩЕНО возвращать полные объекты без фильтрации:**
```typescript
return this.formatSuccess({
  data: fullObject  // WRONG! 10KB избыточных данных
});
```

**✅ ПРАВИЛЬНО - всегда фильтровать через fields:**
```typescript
const { fields, ...params } = validation.data;
const data = await this.facade.getData(params);

const filtered = ResponseFieldFilter.filter(data, fields);
return this.formatSuccess({
  data: filtered,
  fieldsReturned: fields
});
```

**Правило:**
- ВСЕ tools, возвращающие объекты API, ДОЛЖНЫ иметь обязательный параметр `fields: FieldsSchema`
- Применяется к: get, find, create, update, add, edit операциям
- НЕ применяется к: delete (void), download (binary), bulk status операциям
- Экономия контекста: до 80-90%

**Для массивов объектов:**
```typescript
const filtered = items.map(item =>
  ResponseFieldFilter.filter<EntityWithUnknownFields>(item, fields)
);
```

---

## 📊 Пагинация в list-инструментах

List-инструменты добавляют поле `pagination` к выдаче **аддитивно** — прежние ключи
(`comments`/`issues`/`count`/...) сохраняются. Пагинация всех 10 list-инструментов
основана на едином непрозрачном курсоре (`cursor`); поле `page` **удалено** (breaking).

**Механизм (через `pagination.nextCursor`):**
- В ответе `pagination.nextCursor` присутствует ⟺ есть следующая страница (выводится из
  `Link rel="next"`). Агент передаёт его в параметр `cursor` **того же** инструмента для
  следующей страницы — для агента это чёрный ящик.
- `pagination.total`/`totalPages` отдаются **только** для seekable-эндпоинтов
  (`queues`/`projects`/`find_issues` — у них `Link rel="seek"`). У cursor-эндпоинтов
  (`changelog`/`comments`/`links`/`worklog`/`checklist`) их нет (seek-gating).
- Непагинируемые `components`/`attachments` возвращают все элементы за один ответ — блока
  `pagination` нет, пагин-параметры в схеме отсутствуют.

**Общие схемы** (`#common/schemas`, единый источник истины — не дублируй по файлам):
- `CursorSchema` — непрозрачный курсор (`cursor`); несовместим с `perPage`/`fetchAll`/
  `maxItems`/`maxTotalItems`, в batch валиден только при одном issueId.
- `FetchAllSchema` — opt-in полного обхода (`fetchAll`).
- `MaxItemsSchema` — лимит записей на цепочку (per-issue, дефолт 500, потолок 1000).
- `MaxTotalItemsSchema` — общий потолок на batch-ответ (дефолт 1000, потолок 5000).
- `makePerPageSchema(max?)` / `PerPageSchema`.
- `noCursorWithBulkParams` + `PAGINATION_CURSOR_CONFLICT_MESSAGE` — `.refine`: `cursor`
  исключает `perPage`/`fetchAll`/`maxItems`/`maxTotalItems`.
- `cursorRequiresSingleIssue` + `PAGINATION_CURSOR_BATCH_MESSAGE` — `.refine` для batch:
  `cursor` валиден ТОЛЬКО при `issueIds.length === 1`.

**Schema:**
```typescript
export const GetCommentsSchema = z
  .object({
    issueIds: IssueKeysSchema,
    fields: FieldsSchema,
    cursor: CursorSchema,
    perPage: makePerPageSchema(500),
    fetchAll: FetchAllSchema,
    maxItems: MaxItemsSchema,
    maxTotalItems: MaxTotalItemsSchema,
  })
  .refine(noCursorWithBulkParams, { message: PAGINATION_CURSOR_CONFLICT_MESSAGE, path: ['cursor'] })
  .refine(cursorRequiresSingleIssue, { message: PAGINATION_CURSOR_BATCH_MESSAGE, path: ['cursor'] });
```

**Tool (batch):** распаковывай `PaginatedResult` хелпером `paginatedFieldFilter`
(`#tracker_api/utils`), сохраняя прежний ключ + добавляя `pagination`:
```typescript
const processed = BatchResultProcessor.process(results, paginatedFieldFilter(fields));
const successful = processed.successful.map((i) => ({
  issueId: i.key,
  comments: i.data.items,
  count: i.data.items.length,
  pagination: i.data.pagination,  // ← аддитивно (с nextCursor, если есть ещё страница)
}));
```

**Tool (single):** отфильтруй `result.items` через `ResponseFieldFilter`, верни прежний ключ
+ `pagination: result.pagination`. `find_issues` НЕ оборачивается — ключ `issues`/`count`
сохранён, `pagination` добавлен соседним полем.

**Семантика для агента** (через `.describe()`): по умолчанию возвращается одна страница —
для следующей передай `pagination.nextCursor` в `cursor` того же инструмента. `fetchAll=true`
подтягивает все страницы до `maxItems`/`maxTotalItems`; обрезка отражается в `truncated`.

---

## 📋 Процесс создания нового API Tool

### Шаг 1: Создать структуру файлов

```bash
mkdir -p src/tools/api/{feature}/{action}/
cd src/tools/api/{feature}/{action}/

# Создать файлы:
# - {action}-{feature}.schema.ts   # ✅ Zod schema с .describe()
# - {action}-{feature}.tool.ts     # ✅ Tool с автогенерацией
# - index.ts                       # ✅ Экспорты
```

### Шаг 2: Schema (Zod валидация) — ЕДИНСТВЕННЫЙ ИСТОЧНИК ИСТИНЫ

**См. полный пример:** `src/tools/api/issues/get/get-issues.schema.ts`

```typescript
export const GetIssuesParamsSchema = z.object({
  keys: z.array(IssueKeySchema).min(1).max(200)
    .describe('Массив ключей задач (["QUEUE-1", "QUEUE-2"])'),
  fields: FieldsSchema  // ОБЯЗАТЕЛЬНЫЙ! БЕЗ .optional()
    .describe('Список возвращаемых полей (["key", "summary"])'),
});
```

**КРИТИЧНО:** Используй `.describe()` для каждого поля - это генерирует MCP definition. НЕ используй `.optional()` для `fields`!

**Переиспользуй схемы** из `@fractalizer/mcp-core`: `IssueKeySchema`, `FieldsSchema`, `ExpandSchema`

---

### Шаг 3: Tool (реализация с автогенерацией)

**См. полный пример:** `src/tools/api/issues/get/get-issues.tool.ts`

```typescript
@injectable()
export class GetIssuesTool extends BaseTool<typeof GetIssuesParamsSchema> {
  static readonly METADATA = {
    name: 'get_issues',
    description: '[Issues/Read] Получить задачи по ключам',
    category: 'issues', subcategory: 'read', priority: 'critical'
  };

  constructor(@inject(TOKENS.YandexTrackerFacade) private facade: YandexTrackerFacade) {
    super(GetIssuesTool.METADATA, GetIssuesParamsSchema);
  }

  getDefinition() {
    return generateDefinitionFromSchema(this.metadata, GetIssuesParamsSchema);
  }

  protected async executeImpl(input) {
    const results = await this.facade.getIssues(input.keys);
    const processed = BatchResultProcessor.process(
      results, (item) => ResponseFieldFilter.filter(item, input.fields)
    );
    ResultLogger.logBatchSuccess(this.logger, 'get_issues', {...});
    return this.formatSuccess({ issues: processed });
  }
}
```

---

### Шаг 4: Регистрация

**Добавить 1 строку в `src/composition-root/definitions/tool-definitions.ts`:**
```typescript
import { GetIssuesTool } from '../tools/api/issues/get/get-issues.tool.js';

export const TOOL_DEFINITIONS = [
  // ... existing tools
  GetIssuesTool,
];
```

**Автоматическая проверка:**
```bash
npm run validate:tools  # Проверит регистрацию всех *.tool.ts
```

---

## 🔧 Утилиты для Tools

### ResponseFieldFilter

**Назначение:** Фильтрация полей ответа (экономия 80-90% токенов)

```typescript
import { ResponseFieldFilter } from '@fractalizer/mcp-core';

// БЕЗ фильтрации: 10KB данных
const fullIssue = { key, summary, description, ..., assignee: {...}, followers: [...] };

// С фильтрацией: 1KB данных
const filtered = ResponseFieldFilter.filter(fullIssue, ['key', 'summary', 'assignee.login']);
// Результат: { key, summary, assignee: { login } }
```

**⚠️ ВСЕГДА фильтруй перед возвратом!**

---

### BatchResultProcessor

**Назначение:** Обработка `BatchResult<TKey, TValue>` → разделение на successful/failed

```typescript
import { BatchResultProcessor } from '@fractalizer/mcp-core';

const results: BatchResult<string, Issue> = await facade.getIssues(keys);

const processed = BatchResultProcessor.process(
  results,
  (issue) => ResponseFieldFilter.filter(issue, params.fields)
);

// Структура:
// {
//   successful: [{ key: 'QUEUE-1', data: {...} }],
//   failed: [{ key: 'QUEUE-2', error: 'Not found' }]
// }
```

---

### ResultLogger

**Назначение:** Structured JSON логирование результатов

```typescript
import { ResultLogger } from '@fractalizer/mcp-core';

ResultLogger.logBatchSuccess(logger, 'operation_name', {
  totalRequested: 10,
  successful: 8,
  failed: 2,
});
```

---

## 📊 Управление составом инструментов

`tools/list` всегда отдаёт полный набор, прошедший access policy, в детерминированном порядке.
Единственный рубильник — `DISABLED_TOOL_GROUPS` (по умолчанию пустой — ничего не отключено).

**Детали:** [../../CLAUDE.md](../../CLAUDE.md)

---

## 📚 Доступные API категории

**Attachments (5 tools):** См. `src/tools/api/issues/attachments/`
**Comments (4 tools):** См. `src/tools/api/issues/comments/`
**Queues (6 tools):** См. `src/tools/api/queues/`
**Components (4 tools):** См. `src/tools/api/components/`
**Checklists (4 tools):** См. `src/tools/api/checklists/`

---

## 🔗 См. также

- **Общие утилиты:** [@fractalizer/mcp-core](../../../../framework/core/src/tools/common/README.md)
- **API Operations:** [../tracker_api/api_operations/README.md](../tracker_api/api_operations/README.md)
- **Dependency Injection:** [../composition-root/README.md](../composition-root/README.md)
- **Yandex Tracker CLAUDE.md:** [../../CLAUDE.md](../../CLAUDE.md)
