# MCP Tools — Yandex Tracker Конвенции

**Разработка MCP tools для Yandex.Tracker сервера**

---

## 🎯 Назначение

**MCP Tools** — это набор инструментов, которые Claude использует для взаимодействия с Яндекс.Трекер API.

**Текущая структура:**
- **API Tools** — работа с Яндекс.Трекер (задачи, проекты, комментарии, работа с очередями)
- **Helper Tools** — утилиты (ping, search_tools)

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
│   │   ├── comments/             # Комментарии к задачам
│   │   └── attachments/          # Файловые вложения
│   │       ├── get/
│   │       ├── upload/
│   │       ├── download/
│   │       ├── delete/
│   │       └── thumbnail/
│   ├── projects/
│   └── queues/
├── helpers/                      # Вспомогательные tools
│   ├── ping/
│   └── search-tools/
└── ping.tool.ts                  # Корневой ping tool
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

1. **Static METADATA** — для Tool Search Engine + категоризация
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

2. **Zod Schema** — валидация параметров (источник истины)
```typescript
const GetIssuesParamsSchema = z.object({
  keys: z.array(z.string()).min(1).max(200).describe('Issue keys'),
  fields: FieldsSchema.optional().describe('Fields to return'),
  expand: ExpandSchema.optional().describe('Expand objects'),
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
- `subcategory` — read/write/workflow (опционально)
- `priority` — critical/high/normal/low (опционально, default: normal)
- `tags` — для поиска через search_tools (опционально)

**Description формат:** `[Category/Subcategory] Краткое описание` (≤80 символов)

---

## 🔄 Schema → Definition (Автогенерация)

**Принцип:** Zod schema = единственный источник истины для MCP definition.

### Новый подход (✅ используй)

**Структура файлов:**
```
{feature}/{action}/
├── {name}.schema.ts       # ✅ Zod schema с .describe()
└── {name}.tool.ts         # ✅ Tool с автогенерацией
```

**Schema с описаниями:**
```typescript
export const GetIssuesSchema = z.object({
  keys: z.array(z.string()).min(1).max(200)
    .describe('Issue keys to retrieve (e.g., ["PROJ-1", "PROJ-2"])'),
  fields: FieldsSchema.optional()
    .describe('Fields to include in response')
});
```

**Tool класс:**
```typescript
export class GetIssuesTool extends BaseTool<typeof GetIssuesSchema> {
  getDefinition(): ToolDefinition {
    return generateDefinitionFromSchema(this.metadata, GetIssuesSchema);
  }
}
```

### Старый подход (❌ устарел)

**Было:**
```
{feature}/{action}/
├── {name}.schema.ts       # Zod schema
├── {name}.definition.ts   # ❌ Ручная definition (удалено)
└── {name}.tool.ts         # Tool
```

**Проблема:** Schema-definition mismatch → инструменты не работали

### Преимущества автогенерации

- ✅ DRY принцип — schema = единственный источник
- ✅ Физически невозможен mismatch
- ✅ Меньше кода — нет отдельных `*.definition.ts`
- ✅ Автосинхронизация — изменения schema сразу в definition

**Детали:** См. `packages/framework/core/README.md` (generateDefinitionFromSchema)

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

### Шаг 2: Schema (Zod валидация)

```typescript
// get-issues.schema.ts
import { z } from 'zod';
import { IssueKeySchema, FieldsSchema } from '@mcp-framework/core';

export const GetIssuesParamsSchema = z.object({
  keys: z.array(IssueKeySchema).min(1).max(200),
  /**
   * ⚠️ ОБЯЗАТЕЛЬНЫЙ параметр - список возвращаемых полей
   */
  fields: FieldsSchema,  // БЕЗ .optional()!
});

export type GetIssuesParams = z.infer<typeof GetIssuesParamsSchema>;
```

**КРИТИЧНО:** НЕ используйте `.optional()` для `fields`!

**Переиспользуй схемы** из `@mcp-framework/core`:
- `IssueKeySchema` — ключ задачи
- `FieldsSchema` — фильтр полей (обязательный!)
- `ExpandSchema` — expand параметры

---

### Шаг 3: Tool (реализация)

```typescript
// get-issues.tool.ts
import { BaseTool } from '@mcp-framework/core';

export class GetIssuesTool extends BaseTool<YandexTrackerFacade> {
  static readonly METADATA: ToolMetadata = {
    name: 'get_issues',
    description: '[Issues/Read] Получить задачи по ключам',
    category: 'issues',
    subcategory: 'read',
    priority: 'critical',
    tags: ['issues', 'read', 'get', 'fetch'],
    inputSchema: zodToJsonSchema(GetIssuesParamsSchema),
  };

  getDefinition(): ToolDefinition {
    return generateDefinitionFromSchema(GetIssuesTool.METADATA, GetIssuesParamsSchema);
  }

  async execute(params: unknown): Promise<ToolResponse> {
    // 1. Валидация
    const validated = this.validateParams(GetIssuesParamsSchema, params);

    // 2. Вызов facade
    const results = await this.facade.getIssues(validated.keys);

    // 3. Обработка результатов
    const processed = BatchResultProcessor.process(
      results,
      (item) => ResponseFieldFilter.filter(item, validated.fields)
    );

    // 4. Логирование
    ResultLogger.logBatchSuccess(this.logger, 'get_issues', {
      totalRequested: validated.keys.length,
      successful: processed.successful.length,
      failed: processed.failed.length,
    });

    // 5. Форматирование ответа
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
import { ResponseFieldFilter } from '@mcp-framework/core';

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
import { BatchResultProcessor } from '@mcp-framework/core';

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
import { ResultLogger } from '@mcp-framework/core';

ResultLogger.logBatchSuccess(logger, 'operation_name', {
  totalRequested: 10,
  successful: 8,
  failed: 2,
});
```

---

## 📊 Tool Discovery Modes

**Eager (по умолчанию):** Все tools видны сразу (Claude Code on the Web, production)
**Lazy (экспериментально):** Только essential tools + search (Claude Desktop, 30+ tools)

**Детали:** [../../CLAUDE.md](../../CLAUDE.md#51-tool-discovery-mode)

---

## 📚 Доступные API категории

**Attachments (5 tools):** См. `src/tools/api/issues/attachments/`
**Comments (4 tools):** См. `src/tools/api/issues/comments/`
**Queues (6 tools):** См. `src/tools/api/queues/`
**Components (4 tools):** См. `src/tools/api/components/`
**Checklists (4 tools):** См. `src/tools/api/checklists/`

---

## 🔗 См. также

- **Общие утилиты:** [@mcp-framework/core](../../../../../framework/core/src/tools/common/README.md)
- **API Operations:** [../tracker_api/api_operations/README.md](../tracker_api/api_operations/README.md)
- **Dependency Injection:** [../composition-root/README.md](../composition-root/README.md)
- **Yandex Tracker CLAUDE.md:** [../../CLAUDE.md](../../CLAUDE.md)
