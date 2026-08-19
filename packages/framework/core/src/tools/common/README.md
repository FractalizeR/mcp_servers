# MCP Tools Common — Переиспользуемые утилиты

**Централизованные утилиты и схемы для сокращения дублирования кода в MCP tools**

---

## 🎯 Назначение

**Проблема:** Дублирование кода валидации, обработки batch-результатов, логирования, фильтрации полей.

**Решение:** Централизованные переиспользуемые утилиты

**Результат:** Сокращение кода tools с ~160 до ~50 строк (~70% экономия)

---

## 📁 Структура

```
src/mcp/tools/common/
├── schemas/                    # Zod схемы для валидации
│   ├── issue-key.schema.ts
│   ├── fields.schema.ts
│   ├── expand.schema.ts
│   └── index.ts
└── utils/                      # Утилиты
    ├── tool-name.ts
    └── index.ts

src/mcp/utils/                  # Общие MCP утилиты
├── response-field-filter.ts
├── batch-result-processor.ts
├── result-logger.ts
└── index.ts

src/mcp/tools/base/             # Базовые классы
├── base-tool.ts                # BaseTool (абстрактный)
├── base-definition.ts          # ToolDefinition (интерфейс)
└── tool-metadata.ts            # Метаданные для поиска
```

---

## 🔧 Компоненты

### 1. BaseTool

**Назначение:** Абстрактный базовый класс для всех MCP tools

**Инкапсулирует:** Facade, логирование, валидация (Zod), форматирование

**Файл:** `src/mcp/tools/base/base-tool.ts`

**Обязательно:**
- `static readonly METADATA` — для поиска
- `getDefinition()` — MCP ToolDefinition
- `execute(params)` — бизнес-логика

**Методы:** `validateParams()`, `formatSuccess()`, `formatError()`

### 2. ResponseFieldFilter

**Назначение:** Фильтрация полей для экономии 80-90% токенов

**Файл:** `src/mcp/utils/response-field-filter.ts`

**Поддержка:** Dot-notation (`assignee.display`), массивы, типобезопасность

**Критически важно:** ✅ ВСЕГДА фильтруй перед возвратом

### 3. BatchResultProcessor

**Назначение:** Обработка `BatchResult<TKey, TValue>` → разделение на successful/failed

**Файл:** `src/mcp/utils/batch-result-processor.ts`

**Результат:** `ProcessedBatchResult<TKey, TValue>` = `{ successful: [{ key, data }], failed: [{ key, error }] }`

### 4. ResultLogger

**Назначение:** Structured JSON логирование результатов

**Файл:** `src/mcp/utils/result-logger.ts`

**Методы:** `logBatchSuccess()`, `logError()` — structured JSON с метаданными

### 5. Zod Schemas

**Назначение:** Переиспользуемые схемы для валидации

**Файл:** `src/mcp/tools/common/schemas/`

**Доступные:**
- `IssueKeySchema` — ключ задачи (непустая строка)
- `FieldsSchema` — массив полей для фильтрации (опционально)
- `ExpandSchema` — массив expand параметров (опционально)

**Экономия:** НЕ дублируй определения

---

## 🚀 Типичный workflow создания API Tool

**Шаги:**
1. Schema: `GetIssuesParamsSchema` (Zod + переиспользуемые схемы)
2. Definition: `getIssuesDefinition` (ToolDefinition для MCP)
3. Tool: extends BaseTool, добавь METADATA, реализуй execute()

**Внутри execute():**
1. Валидация: `validateParams(schema, params)`
2. Вызов operation: `trackerFacade.getIssues(keys)`
3. Обработка: `BatchResultProcessor.process(results, filterFn)`
4. Логирование: `ResultLogger.logBatchSuccess(...)`
5. Форматирование: `formatSuccess(data)`

**Экономия:** ~110 строк → ~50 строк

**Реальный пример:** `src/mcp/tools/api/issues/get/get-issues.tool.ts`

---

## 🚨 Критические правила

### 1. ВСЕГДА используй ResponseFieldFilter перед возвратом

```typescript
// ❌ БЕЗ фильтрации (отправляем 10KB данных)
return this.formatSuccess({ issues: data });

// ✅ С фильтрацией (отправляем 1KB данных)
const filtered = ResponseFieldFilter.filter(data, params.fields);
return this.formatSuccess({ issues: filtered });
```

### 2. ВСЕГДА добавляй static METADATA

```typescript
// ❌ Забыли METADATA — tool НЕ появится в поиске
export class MyTool extends BaseTool { ... }

// ✅ С METADATA
export class MyTool extends BaseTool {
  static readonly METADATA: StaticToolMetadata = {
    name: 'fyt_mcp_my_tool',
    category: 'api',
    tags: ['feature'],
  };
}
```

### 3. Используй BatchResultProcessor для batch-операций

```typescript
// ✅ Стандартизированная обработка
const processed = BatchResultProcessor.process(results, filterFn);

// Получаем структуру:
// { successful: [{ key, data }], failed: [{ key, error }] }
```

### 4. Логируй результаты через ResultLogger

```typescript
// ✅ Structured logging
ResultLogger.logBatchSuccess(logger, 'operation_name', {
  totalRequested: 10,
  successful: 8,
  failed: 2,
});
```

### 5. Переиспользуй Zod схемы

```typescript
// ✅ НЕ дублируй определения
import { IssueKeySchema, FieldsSchema } from '@mcp/tools/common/schemas/index.js';

// ❌ НЕ создавай заново
const IssueKeySchema = z.string().min(1); // Дублирование!
```

---

## 🔗 См. также

- **BaseTool подробно:** [src/mcp/tools/base/base-tool.ts](../base/base-tool.ts)
- **MCP Tools конвенции:** [src/mcp/README.md](../../README.md)
- **ResponseFieldFilter примеры:** [src/mcp/utils/response-field-filter.ts](../../utils/response-field-filter.ts)
- **ARCHITECTURE.md:** [ARCHITECTURE.md](../../../../ARCHITECTURE.md)
