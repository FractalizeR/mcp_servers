# Operations — Конвенции разработки

**Перед созданием новой Operation ОБЯЗАТЕЛЬНО прочитай этот файл.**

---

## 🎯 Назначение Operations

**Operation** — бизнес-операция для работы с API Яндекс.Трекера:
- Инкапсулирует логику взаимодействия с конкретным endpoint
- Обрабатывает ошибки и преобразует их в `ApiError`
- Использует `ParallelExecutor` для batch-операций
- Возвращает типизированные данные (`*WithUnknownFields`)

**⚠️ ВАЖНО:** Operations — internal API, используются только через `YandexTrackerFacade`

---

## 📁 Структура

```
src/tracker_api/api_operations/{feature}/
├── {name}.operation.ts    # Класс Operation
├── index.ts               # Экспорты
```

**Примеры:**
- `api_operations/issue/get-issues.operation.ts`
- `api_operations/user/ping.operation.ts`

---

## 🏗️ Базовый класс BaseOperation

**Что предоставляет:**
- `httpClient: HttpClient` — для HTTP запросов
- `retryHandler: RetryHandler` — для retry логики (уже встроен в HttpClient)
- `cacheManager: CacheManager` — для кеширования
- `logger: Logger` — для логирования
- `withCache<T>(cacheKey, fn)` — helper метод для кеширования результата

**Примечание:** `ParallelExecutor` создаётся в конкретных batch-операциях,
не передаётся через BaseOperation.

**Наследуй BaseOperation для всех операций:**
```typescript
export class GetIssuesOperation extends BaseOperation {
  async execute(issueKeys: string[]): Promise<BatchResult<IssueWithUnknownFields>> {
    // ...
  }
}
```

---

## 📊 Типы результатов

### Batch-операции

✅ **Используй стандартные типы из `@types`:**
```typescript
import type { BatchResult } from '@types';

// Operation возвращает BatchResult<T>
async execute(keys: string[]): Promise<BatchResult<IssueWithUnknownFields>> {
  const results = await this.parallelExecutor.execute(
    keys,
    async (key) => this.fetchIssue(key)
  );

  // results уже в формате BatchResult
  return results;
}
```

### Одиночные операции

```typescript
async execute(): Promise<UserWithUnknownFields> {
  const response = await this.httpClient.get<User>('/v3/myself');
  return response; // User + unknown поля
}
```

---

## 🔄 Batch-операции через ParallelExecutor

**Для операций, работающих с массивом элементов:**

```typescript
async execute(issueKeys: string[]): Promise<BatchResult<IssueWithUnknownFields>> {
  // ParallelExecutor автоматически:
  // - Валидирует количество (не больше maxBatchSize)
  // - Выполняет параллельно (до maxConcurrentRequests)
  // - Возвращает BatchResult с fulfilled/rejected

  const operations = issueKeys.map((key) => ({
    key,
    fn: async () => {
      const cacheKey = EntityCacheKey.createKey(EntityType.Issue, key);
      return this.withCache(cacheKey, async () => {
        return this.httpClient.get<IssueWithUnknownFields>(`/v3/issues/${key}`);
      });
    },
  }));

  return this.parallelExecutor.executeParallel(operations, 'getIssues');
}
```

**⚠️ НЕ используй вручную `Promise.allSettled()` — используй `ParallelExecutor`**

---

## 🗄️ Кеширование

**Для GET операций с высокой частотой запросов:**

```typescript
import { EntityCacheKey, EntityType } from '@infrastructure/cache/entity-cache-key.js';

const cacheKey = EntityCacheKey.createKey(EntityType.Issue, issueKey);
const issue = await this.withCache(cacheKey, async () => {
  return this.httpClient.get<IssueWithUnknownFields>(`/v3/issues/${issueKey}`);
});
```

**По умолчанию:** `NoOpCache` (без кеширования)
**Настройка:** Через DI container (будущее улучшение)

---

## 📋 Чек-лист создания Operation

- [ ] Создать файл `src/tracker_api/api_operations/{feature}/{name}.operation.ts`
- [ ] **Наследовать BaseOperation:**
  ```typescript
  export class NewOperation extends BaseOperation {
    async execute(params: ParamsDTO): Promise<ResultWithUnknownFields> {
      // ...
    }
  }
  ```
- [ ] **Для batch-операций:**
  - [ ] Использовать `ParallelExecutor.execute()`
  - [ ] Возвращать `BatchResult<T>`
  - [ ] Добавить кеширование через `EntityCacheKey` (если применимо)
- [ ] **Для одиночных операций:**
  - [ ] Использовать `this.httpClient.get/post/patch/delete()`
  - [ ] Возвращать `*WithUnknownFields`
- [ ] **Экспорт:**
  - [ ] Добавить в `api_operations/{feature}/index.ts`
  - [ ] Экспортировать типы результатов (если batch)
- [ ] **Facade метод:**
  - [ ] Создать публичный метод в `YandexTrackerFacade`
  - [ ] Делегировать вызов в Operation
- [ ] **АВТОМАТИЧЕСКАЯ РЕГИСТРАЦИЯ:**
  - [ ] Добавь класс в `src/composition-root/definitions/operation-definitions.ts`
  - [ ] ВСЁ! (DI регистрация, TYPES — автоматически)
- [ ] **Тесты:**
  - [ ] `tests/unit/tracker_api/api_operations/{feature}/{name}.operation.test.ts`
  - [ ] Успешный сценарий
  - [ ] Обработка ошибок API (404, 500, etc.)
  - [ ] Batch-операции: частичный успех
  - [ ] Покрытие ≥80%
- [ ] `npm run validate` — проходит

---

## 🚨 Критические правила

### 1. API v3 ТОЛЬКО

✅ **Правильно:**
```typescript
this.httpClient.get('/v3/issues/PROJ-123');
this.httpClient.get('/v3/myself');
```

❌ **Неправильно:**
```typescript
this.httpClient.get('/v2/issues'); // Старый API
this.httpClient.get('/issues');    // Без версии
```

---

### 2. Типы с unknown полями

✅ **Правильно:**
```typescript
async execute(): Promise<IssueWithUnknownFields> {
  const issue = await this.httpClient.get<Issue>('/v3/issues/...');
  return issue; // Issue + unknown поля автоматически
}
```

❌ **Неправильно:**
```typescript
async execute(): Promise<Issue> { ... } // Теряем unknown поля
```

---

### 3. Обработка ошибок

**HttpClient автоматически преобразует ошибки в `ApiError`:**
- 404 → `{ statusCode: 404, message: '...' }`
- 429 → `{ statusCode: 429, message: '...', retryAfter: 60 }`
- 500 → `{ statusCode: 500, message: '...' }`

**⚠️ НЕ используй try-catch для обработки API ошибок** — они уже обработаны

---

### 4. Single Responsibility Principle

- Одна Operation = одна бизнес-операция
- НЕ смешивай CRUD операции в одном классе
- Пример: `GetIssuesOperation` ≠ `CreateIssueOperation`

---

## 📚 Примеры

### Batch-операция

**Эталон:** `src/tracker_api/api_operations/issue/get-issues.operation.ts`

```typescript
export class GetIssuesOperation extends BaseOperation {
  async execute(issueKeys: string[]): Promise<BatchResult<IssueWithUnknownFields>> {
    if (issueKeys.length === 0) {
      this.logger.warn('Пустой массив ключей');
      return [];
    }

    this.logger.info(`Получение ${issueKeys.length} задач`);

    const operations = issueKeys.map((key) => ({
      key,
      fn: async () => {
        const cacheKey = EntityCacheKey.createKey(EntityType.Issue, key);
        return this.withCache(cacheKey, async () => {
          return this.httpClient.get<IssueWithUnknownFields>(`/v3/issues/${key}`);
        });
      },
    }));

    return this.parallelExecutor.executeParallel(operations, 'getIssues');
  }
}
```

### Одиночная операция

**Эталон:** `src/tracker_api/api_operations/user/ping.operation.ts`

```typescript
export class PingOperation extends BaseOperation {
  async execute(): Promise<UserWithUnknownFields> {
    this.logger.info('Проверка доступности API');

    const user = await this.httpClient.get<User>('/v3/myself');

    this.logger.info(`API доступен. Текущий пользователь: ${user.login}`);
    return user;
  }
}
```

---

## 🔗 См. также

- **Facade конвенции:** [src/tracker_api/facade/README.md](../facade/README.md) (если создашь)
- **Entities:** [src/tracker_api/entities/CONVENTIONS.md](../entities/CONVENTIONS.md)
- **DTO:** [src/tracker_api/dto/CONVENTIONS.md](../dto/CONVENTIONS.md)
- **DI:** [src/composition-root/CONVENTIONS.md](../../composition-root/CONVENTIONS.md)
