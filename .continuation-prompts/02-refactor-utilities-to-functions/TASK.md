# Этап 2: Преобразовать утилиты в pure functions

## 🎯 Цель

**Проблема:** Stateless классы с `static` методами — антипаттерн в TypeScript. Нет состояния, но используются классы вместо функций.

**Текущий код:**
```typescript
export class BatchResultProcessor {
  static process<TKey, TValue>(...) { /* нет this, нет state */ }
}

// Использование
BatchResultProcessor.process(results, filterFn);
```

**Целевой код:**
```typescript
export function processBatchResults<TKey, TValue>(...) { }

// Использование
processBatchResults(results, filterFn);
```

**Преимущества:**
- ✅ Меньше boilerplate (нет `class`, нет `static`)
- ✅ Лучше tree-shaking (импортируется только функция, а не весь класс)
- ✅ Легче композировать (`pipe`, `compose`)
- ✅ Функциональный стиль (TypeScript community best practice)

---

## ✅ Что делать

### 1. Прочитать текущую реализацию

**Обязательно прочитай:**
- `src/mcp/utils/batch-result-processor.ts`
- `src/mcp/utils/result-logger.ts`
- `src/mcp/utils/response-field-filter.ts`

### 2. Преобразовать BatchResultProcessor

**Текущий файл:** `src/mcp/utils/batch-result-processor.ts`

**Изменения:**
```typescript
// ❌ Удалить класс
export class BatchResultProcessor {
  static process<TKey, TInputValue, TOutputValue = TInputValue>(...) { }
  private static isFulfilledResult<TKey, TValue>(...) { }
}

// ✅ Заменить на функции
export function processBatchResults<TKey, TInputValue, TOutputValue = TInputValue>(
  results: BatchResult<TKey, TInputValue>,
  filterFn?: (item: TInputValue) => TOutputValue
): ProcessedBatchResult<TKey, TOutputValue> {
  const successful: Array<{ key: TKey; data: TOutputValue }> = [];
  const failed: Array<{ key: TKey; error: string }> = [];

  for (const result of results) {
    if (isFulfilledBatchResult(result)) {
      if (!result.value) {
        failed.push({
          key: result.key,
          error: 'Сущность не найдена (пустой результат)',
        });
        continue;
      }

      const data: TOutputValue = filterFn
        ? filterFn(result.value)
        : (result.value as TOutputValue);

      successful.push({ key: result.key, data });
    } else {
      const error =
        result.reason instanceof Error ? result.reason.message : String(result.reason);
      failed.push({ key: result.key, error });
    }
  }

  return { successful, failed };
}

// Helper (экспортируется отдельно)
export function isFulfilledBatchResult<TKey, TValue>(
  result: FulfilledResult<TKey, TValue> | RejectedResult<TKey>
): result is FulfilledResult<TKey, TValue> {
  return result.status === 'fulfilled';
}
```

**Обновить экспорты в `src/mcp/utils/index.ts`:**
```typescript
export { processBatchResults, isFulfilledBatchResult } from './batch-result-processor.js';
export type { ProcessedBatchResult } from './batch-result-processor.js';
```

### 3. Преобразовать ResultLogger

**Текущий файл:** `src/mcp/utils/result-logger.ts`

**Изменения:**
```typescript
// ❌ Удалить класс
export class ResultLogger {
  static logBatchResults<TKey, TValue>(...) { }
  static logOperationStart(...) { }
}

// ✅ Заменить на функции
export function logBatchResults<TKey, TValue>(
  logger: Logger,
  operationName: string,
  config: ResultLogConfig,
  results?: ProcessedBatchResult<TKey, TValue>
): void {
  logger.debug(`${operationName} (${config.totalRequested} шт.)`, {
    successful: config.successCount,
    failed: config.failedCount,
    fieldsCount: config.fieldsCount,
  });

  if (results && results.successful.length > 0) {
    const totalSize = results.successful.reduce(
      (sum, item) => sum + JSON.stringify(item.data).length,
      0
    );

    logger.debug('Статистика размеров ответа', {
      totalSize,
      averageSize: Math.round(totalSize / results.successful.length),
      itemsCount: results.successful.length,
    });
  }
}

export function logOperationStart(
  logger: Logger,
  operationName: string,
  itemsCount: number,
  fields?: string[]
): void {
  logger.info(`${operationName}: ${itemsCount}`, {
    itemsCount,
    fields: fields ? fields.length : 'all',
  });
}
```

**Обновить экспорты в `src/mcp/utils/index.ts`:**
```typescript
export { logBatchResults, logOperationStart } from './result-logger.js';
export type { ResultLogConfig } from './result-logger.js';
```

### 4. Преобразовать ResponseFieldFilter

**Текущий файл:** `src/mcp/utils/response-field-filter.ts`

**Изменения:**
```typescript
// ❌ Удалить класс
export class ResponseFieldFilter {
  static filter<T extends Record<string, unknown>>(...) { }
}

// ✅ Заменить на функцию
export function filterResponseFields<T extends Record<string, unknown>>(
  data: T,
  fields: string[]
): Partial<T> {
  if (fields.length === 0) {
    return data;
  }

  const filtered: Partial<T> = {};

  for (const field of fields) {
    if (field in data) {
      filtered[field as keyof T] = data[field];
    }
  }

  return filtered;
}
```

**Обновить экспорты в `src/mcp/utils/index.ts`:**
```typescript
export { filterResponseFields } from './response-field-filter.js';
```

### 5. Обновить все импорты в tools

**Найди все использования:**
```bash
# Поиск BatchResultProcessor
grep -r "BatchResultProcessor" src/mcp/tools/

# Поиск ResultLogger
grep -r "ResultLogger" src/mcp/tools/

# Поиск ResponseFieldFilter
grep -r "ResponseFieldFilter" src/mcp/tools/
```

**Замени импорты и вызовы:**

**Было:**
```typescript
import { BatchResultProcessor, ResultLogger, ResponseFieldFilter } from '@mcp/utils/index.js';

const processed = BatchResultProcessor.process(results, filterFn);
ResultLogger.logOperationStart(this.logger, 'Операция', count, fields);
const filtered = ResponseFieldFilter.filter(data, fields);
```

**Стало:**
```typescript
import {
  processBatchResults,
  logOperationStart,
  logBatchResults,
  filterResponseFields
} from '@mcp/utils/index.js';

const processed = processBatchResults(results, filterFn);
logOperationStart(this.logger, 'Операция', count, fields);
const filtered = filterResponseFields(data, fields);
```

**Файлы для обновления (минимум):**
- `src/mcp/tools/api/issues/get/get-issues.tool.ts`
- `src/mcp/tools/api/issues/find/find-issues.tool.ts`
- `src/mcp/tools/api/issues/create/create-issue.tool.ts`
- `src/mcp/tools/api/issues/update/update-issue.tool.ts`
- `src/mcp/tools/api/issues/changelog/get-issue-changelog.tool.ts`
- `src/mcp/tools/api/issues/transitions/get/get-issue-transitions.tool.ts`
- `src/mcp/tools/api/issues/transitions/execute/transition-issue.tool.ts`

**Используй global search and replace для ускорения.**

### 6. Обновить тесты

**Файлы тестов:**
- `tests/unit/mcp/utils/batch-result-processor.test.ts`
- `tests/unit/mcp/utils/result-logger.test.ts`
- `tests/unit/mcp/utils/response-field-filter.test.ts`

**Изменения:**
```typescript
// ❌ Было
import { BatchResultProcessor } from '@mcp/utils/batch-result-processor.js';
const result = BatchResultProcessor.process(...);

// ✅ Стало
import { processBatchResults } from '@mcp/utils/batch-result-processor.js';
const result = processBatchResults(...);
```

---

## 🧪 Критерии готовности

- [ ] Классы `BatchResultProcessor`, `ResultLogger`, `ResponseFieldFilter` удалены
- [ ] Созданы функции `processBatchResults`, `logBatchResults`, `logOperationStart`, `filterResponseFields`
- [ ] Все импорты в `src/mcp/tools/` обновлены
- [ ] Все тесты обновлены и проходят
- [ ] `npm run build` успешен (нет TypeScript ошибок)
- [ ] `npm run test:unit` проходит без ошибок
- [ ] `npm run validate` проходит полностью

---

## 🔧 Команды для проверки

```bash
# 1. Убедиться что нет TypeScript ошибок
npm run build

# 2. Запустить тесты
npm run test:unit

# 3. Полная валидация
npm run validate
```

---

## 📝 После выполнения

1. **Закоммитить изменения:**
   ```bash
   git add src/mcp/utils/ src/mcp/tools/ tests/unit/mcp/utils/
   git commit -m "refactor(utils): преобразовать stateless классы в pure functions

   - BatchResultProcessor → processBatchResults()
   - ResultLogger → logBatchResults(), logOperationStart()
   - ResponseFieldFilter → filterResponseFields()

   Преимущества:
   - Меньше boilerplate
   - Лучше tree-shaking
   - TypeScript best practice для stateless утилит"
   ```

2. **Удалить этот файл:**
   ```bash
   rm -rf .continuation-prompts/02-refactor-utilities-to-functions
   ```

3. **Запушить в feature branch:**
   ```bash
   git push -u origin claude/refactor-utilities-to-functions-<session-id>
   ```

---

## ⚠️ Важные замечания

- **НЕ изменяй логику** — только преобразуй класс → функцию
- **Используй global search** для замены импортов (это быстрее)
- **Запускай тесты после каждого файла** — проще найти ошибки
- **Type inference должен работать** — TypeScript выводит типы автоматически
