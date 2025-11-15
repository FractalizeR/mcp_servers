# MCP Tools — Конвенции разработки

**Перед созданием нового MCP Tool ОБЯЗАТЕЛЬНО прочитай этот файл.**

---

## 🎯 Типы Tools

### API Tool (прямой доступ к API)
- **Назначение:** 1 tool = 1 API endpoint (или batch-версия)
- **Пример:** `GetIssuesTool` → `GET /v3/issues/{keys}`
- **Расположение:** `src/mcp/tools/api/{feature}/{action}/`

### Helper Tool (композитные операции)
- **Назначение:** Комбинация нескольких API calls или сложная бизнес-логика
- **Пример:** `CalculateSprintVelocityTool` (несколько запросов + вычисления)
- **Расположение:** `src/mcp/tools/helpers/{feature}/{action}/`

---

## 🔧 Переиспользуемые утилиты

### 1. BaseTool — Базовый класс

**Что предоставляет:**
- `validateParams<T>(params, schema)` — централизованная валидация через Zod
- `formatSuccess(data)` — форматирование успешного результата
- `formatError(message, error)` — форматирование ошибки с логированием

**Использование:**
```typescript
const validation = this.validateParams(params, ParamsSchema);
if (!validation.success) return validation.error;
const { param1, param2 } = validation.data; // Type-safe!
```

**⚠️ НЕ дублируй логику валидации — используй `validateParams()`**

---

### 2. BatchResultProcessor — Обработка batch-результатов

**Назначение:** Разделение успешных/неудачных результатов batch-операций

**Использование:**
```typescript
const results = await this.trackerFacade.getIssues(keys);
const processed = BatchResultProcessor.process(
  results,
  fields ? (item) => ResponseFieldFilter.filter(item, fields) : undefined
);
// processed.successful: { issueKey, data }[]
// processed.failed: { issueKey, error }[]
```

**⚠️ НЕ пиши собственную логику обработки batch-результатов**

---

### 3. ResultLogger — Стандартизированное логирование

**Методы:**
- `logOperationStart(logger, name, count, fields?)` — логирование начала
- `logBatchResults(logger, name, config, results?)` — логирование результатов

**Использование:**
```typescript
ResultLogger.logOperationStart(this.logger, 'Получение задач', keys.length, fields);
// ... выполнение операции
ResultLogger.logBatchResults(this.logger, 'Задачи получены', {
  totalRequested: keys.length,
  successCount: processed.successful.length,
  failedCount: processed.failed.length,
  fieldsCount: fields?.length ?? 'all',
}, processed);
```

**⚠️ НЕ используй custom логирование — используй `ResultLogger`**

---

### 4. ResponseFieldFilter — Фильтрация полей

**Использование:**
```typescript
const filtered = ResponseFieldFilter.filter<IssueWithUnknownFields>(issue, fields);
```

**Экономия:** 80-90% размера ответа при фильтрации полей

---

## 📁 Структура файлов Tool

```
src/mcp/tools/api/{feature}/{action}/
├── {action}.schema.ts      # Zod схема валидации параметров
├── {action}.definition.ts  # BaseToolDefinition — описание для ИИ
├── {action}.tool.ts        # BaseTool — реализация execute()
└── index.ts                # Экспорты
```

**Пример:**
```
src/mcp/tools/api/issues/get/
├── get-issues.schema.ts
├── get-issues.definition.ts
├── get-issues.tool.ts
└── index.ts
```

---

## 📋 Шаблон Tool (batch-операция)

```typescript
export class NewTool extends BaseTool {
  /**
   * Статические метаданные (ОБЯЗАТЕЛЬНО для Tool Search)
   */
  static override readonly METADATA = {
    name: 'yandex_tracker_new_operation',
    description: 'Краткое описание операции',
    category: ToolCategory.ISSUES,
    tags: ['tag1', 'tag2', 'operation-type'],
    isHelper: false, // false для API tools, true для helpers
  } as const;

  private readonly definition = new NewDefinition();

  getDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация через BaseTool (НЕ дублируй логику)
    const validation = this.validateParams(params, ParamsSchema);
    if (!validation.success) return validation.error;

    const { keys, fields } = validation.data;

    try {
      // 2. Логирование старта
      ResultLogger.logOperationStart(this.logger, 'Операция', keys.length, fields);

      // 3. API вызов через Facade
      const results = await this.trackerFacade.someOperation(keys);

      // 4. Обработка результатов (НЕ дублируй логику)
      const processed = BatchResultProcessor.process(
        results,
        fields
          ? (issue: IssueWithUnknownFields): Partial<IssueWithUnknownFields> =>
              ResponseFieldFilter.filter<IssueWithUnknownFields>(issue, fields)
          : undefined
      );

      // 5. Логирование результатов
      ResultLogger.logBatchResults(
        this.logger,
        'Операция завершена',
        {
          totalRequested: keys.length,
          successCount: processed.successful.length,
          failedCount: processed.failed.length,
          fieldsCount: fields?.length ?? 'all',
        },
        processed
      );

      // 6. Форматирование ответа
      return this.formatSuccess({
        total: keys.length,
        successful: processed.successful.length,
        failed: processed.failed.length,
        items: processed.successful.map(item => ({
          key: item.issueKey,
          data: item.data,
        })),
        errors: processed.failed,
        fieldsReturned: fields ?? 'all',
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка операции`, error as Error);
    }
  }
}
```

---

## ✅ Чек-лист создания API Tool

- [ ] Определить тип: API (1 endpoint) или Helper (композитная операция)
- [ ] Создать структуру `src/mcp/tools/api/{feature}/{action}/`
- [ ] **{action}.schema.ts** — Zod схема параметров
  - [ ] Переиспользуй схемы из `@mcp/tools/common/schemas/` (IssueKeySchema, FieldsSchema)
  - [ ] Type inference: `type Params = z.infer<typeof Schema>`
- [ ] **{action}.definition.ts** — наследует `BaseToolDefinition`
  - [ ] `build()` возвращает `ToolDefinition`
  - [ ] Используй helper-методы: `buildStringParam()`, `buildArrayParam()`, etc.
  - [ ] Детальное описание для ИИ агента (примеры, ограничения)
- [ ] **{action}.tool.ts** — наследует `BaseTool`
  - [ ] ✅ **ОБЯЗАТЕЛЬНО:** `static override readonly METADATA` с метаданными для Tool Search
  - [ ] ✅ Валидация: `this.validateParams(params, Schema)`
  - [ ] ✅ Batch-обработка: `BatchResultProcessor.process()`
  - [ ] ✅ Логирование: `ResultLogger.logOperationStart()` и `.logBatchResults()`
  - [ ] ✅ Фильтрация: `ResponseFieldFilter.filter()` (если применимо)
  - [ ] ❌ НЕ дублируй логику валидации, обработки, логирования
- [ ] **index.ts** — экспорт `{ NewTool, NewDefinition, NewParamsSchema }`
- [ ] **АВТОМАТИЧЕСКАЯ РЕГИСТРАЦИЯ:**
  - [ ] Добавь класс в `src/composition-root/definitions/tool-definitions.ts`
  - [ ] ВСЁ! (DI регистрация, TYPES, ToolRegistry — автоматически)
- [ ] **Тесты:** `tests/unit/mcp/tools/api/{feature}/{action}/{action}.tool.test.ts`
  - [ ] Успешный сценарий
  - [ ] Валидация параметров (неправильные данные)
  - [ ] Обработка ошибок API
  - [ ] Покрытие ≥80%
- [ ] `npm run validate` — проходит (lint + typecheck + tests + depcruise + build)

---

## 🚨 Критические правила

### 1. НЕ дублируй логику

❌ **НЕПРАВИЛЬНО:**
```typescript
// Ручная валидация
const validationResult = Schema.safeParse(params);
if (!validationResult.success) {
  return this.formatError('Ошибка валидации', ...);
}

// Ручная обработка batch-результатов
const successful = [];
const failed = [];
for (const result of results) {
  if (result.status === 'fulfilled') { ... }
}
```

✅ **ПРАВИЛЬНО:**
```typescript
// Используй BaseTool.validateParams()
const validation = this.validateParams(params, Schema);
if (!validation.success) return validation.error;

// Используй BatchResultProcessor
const processed = BatchResultProcessor.process(results, filterFn);
```

---

### 2. Типобезопасность batch-результатов

✅ **Используй стандартные типы из `@types`:**
```typescript
import type { BatchResult, FulfilledResult, RejectedResult } from '@types';

// Operations возвращают BatchResult<T>
async getIssues(keys: string[]): Promise<BatchResult<IssueWithUnknownFields>> { ... }
```

---

### 3. Single Responsibility Principle

- Один tool = одна ответственность
- Tool только **координирует**, бизнес-логика в утилитах
- Приватные методы = признак нарушения SRP (должны быть в утилитах)

---

### 4. Фильтрация полей обязательна

Если tool возвращает данные из API:
- Tool params ДОЛЖНЫ иметь `fields?: string[]`
- Перед возвратом ОБЯЗАТЕЛЬНО фильтруй через `ResponseFieldFilter`
- Экономия токенов: 80-90%

---

### 5. Статические метаданные обязательны

✅ **Правильно:**
```typescript
export class GetIssuesTool extends BaseTool {
  static override readonly METADATA = {
    name: 'yandex_tracker_get_issues',
    description: 'Получить задачи по ключам',
    category: ToolCategory.ISSUES,
    tags: ['issue', 'get', 'batch'],
    isHelper: false,
  } as const;
}
```

❌ **Неправильно:**
```typescript
export class GetIssuesTool extends BaseTool {
  // ❌ Отсутствует METADATA
}
```

**Почему:** METADATA используется для compile-time индексирования (Tool Search System).
Без этого инструмент не будет найден через SearchToolsTool.

---

## 📚 Примеры

**Эталонный пример:** `src/mcp/tools/api/issues/get/get-issues.tool.ts`

**Показывает:**
- Использование всех утилит
- Правильную структуру `execute()`
- Type-safe работу с batch-результатами
- Обработку ошибок

---

## 🔗 См. также

- **Архитектура:** [ARCHITECTURE.md](../../ARCHITECTURE.md)
- **Общие правила:** [CLAUDE.md](../../CLAUDE.md)
- **DI конвенции:** [src/composition-root/CONVENTIONS.md](../composition-root/CONVENTIONS.md)
