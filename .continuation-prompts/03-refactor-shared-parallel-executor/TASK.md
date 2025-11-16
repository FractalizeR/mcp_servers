# Этап 3: Shared ParallelExecutor через DI

## 🎯 Цель

**Проблема 1 (ISP):** BaseOperation зависит от полного `ServerConfig`, хотя нужны только 2 поля:
```typescript
constructor(
  httpClient: ...,
  cacheManager: ...,
  logger: ...,
  config: ServerConfig // ← вся конфигурация (10+ полей)!
) {
  this.parallelExecutor = new ParallelExecutor(logger, {
    maxBatchSize: config.maxBatchSize, // ← нужны только 2 поля
    maxConcurrentRequests: config.maxConcurrentRequests,
  });
}
```

**Проблема 2 (DRY):** Каждая batch-операция создаёт свой `ParallelExecutor` с одинаковыми параметрами. Это дублирование кода и ресурсов.

**Решение:**
- Зарегистрировать `ParallelExecutor` как Singleton в DI контейнере
- Инъектировать его в операции через конструктор
- Убрать зависимость от `ServerConfig` в операциях

---

## ✅ Что делать

### 1. Прочитать текущую реализацию

**Обязательно прочитай:**
- `src/infrastructure/async/parallel-executor.ts`
- `src/tracker_api/api_operations/issue/get-issues.operation.ts`
- `src/composition-root/container.ts`
- `src/composition-root/types.ts`

### 2. Зарегистрировать ParallelExecutor в DI контейнере

**Файл:** `src/composition-root/container.ts`

**Добавить новую функцию регистрации:**
```typescript
/**
 * Регистрация ParallelExecutor (shared across all operations)
 */
function bindParallelExecutor(container: Container): void {
  container.bind<ParallelExecutor>(TYPES.ParallelExecutor).toDynamicValue(() => {
    const logger = container.get<Logger>(TYPES.Logger);
    const config = container.get<ServerConfig>(TYPES.ServerConfig);

    return new ParallelExecutor(logger, {
      maxBatchSize: config.maxBatchSize,
      maxConcurrentRequests: config.maxConcurrentRequests,
    });
  });
}
```

**Вызвать в `createContainer()`:**
```typescript
export async function createContainer(config: ServerConfig): Promise<Container> {
  const container = new Container({
    defaultScope: 'Singleton',
  });

  bindInfrastructure(container, config);
  bindHttpLayer(container);
  bindCacheLayer(container);
  bindParallelExecutor(container); // ← НОВОЕ
  bindOperations(container);
  bindFacade(container);
  bindToolRegistry(container);
  bindSearchEngine(container);
  bindTools(container);
  await bindSearchToolsTool(container);

  return container;
}
```

### 3. Добавить символ в TYPES

**Файл:** `src/composition-root/types.ts`

**Добавить в секцию Infrastructure:**
```typescript
export const TYPES = {
  // === Config & Infrastructure ===
  ServerConfig: Symbol.for('ServerConfig'),
  Logger: Symbol.for('Logger'),

  // === HTTP Layer ===
  HttpClient: Symbol.for('HttpClient'),
  RetryStrategy: Symbol.for('RetryStrategy'),

  // === Cache Layer ===
  CacheManager: Symbol.for('CacheManager'),

  // === Async Layer ===
  ParallelExecutor: Symbol.for('ParallelExecutor'), // ← НОВОЕ

  // ... остальные
} as const;
```

**Добавить импорт:**
```typescript
// В начале файла
import { ParallelExecutor } from '@infrastructure/async/parallel-executor.js';
```

### 4. Обновить GetIssuesOperation

**Файл:** `src/tracker_api/api_operations/issue/get-issues.operation.ts`

**Было:**
```typescript
export class GetIssuesOperation extends BaseOperation {
  private readonly parallelExecutor: ParallelExecutor;

  constructor(
    httpClient: ConstructorParameters<typeof BaseOperation>[0],
    cacheManager: ConstructorParameters<typeof BaseOperation>[1],
    logger: ConstructorParameters<typeof BaseOperation>[2],
    config: ServerConfig // ← убрать
  ) {
    super(httpClient, cacheManager, logger);

    // Инициализируем ParallelExecutor для соблюдения concurrency limits
    this.parallelExecutor = new ParallelExecutor(logger, {
      maxBatchSize: config.maxBatchSize,
      maxConcurrentRequests: config.maxConcurrentRequests,
    });
  }

  // ...
}
```

**Стало:**
```typescript
export class GetIssuesOperation extends BaseOperation {
  private readonly parallelExecutor: ParallelExecutor;

  constructor(
    httpClient: ConstructorParameters<typeof BaseOperation>[0],
    cacheManager: ConstructorParameters<typeof BaseOperation>[1],
    logger: ConstructorParameters<typeof BaseOperation>[2],
    parallelExecutor: ParallelExecutor // ← инъекция
  ) {
    super(httpClient, cacheManager, logger);
    this.parallelExecutor = parallelExecutor;
  }

  // ...
}
```

**Удалить импорт ServerConfig:**
```typescript
// ❌ Удалить
import type { BatchResult, ServerConfig } from '@types';

// ✅ Оставить
import type { BatchResult } from '@types';
```

**Добавить импорт ParallelExecutor (если нет):**
```typescript
import { ParallelExecutor } from '@infrastructure/async/parallel-executor.js';
```

### 5. Обновить регистрацию операций в контейнере

**Файл:** `src/composition-root/container.ts`

**Функция `bindOperations()` — было:**
```typescript
function bindOperations(container: Container): void {
  for (const OperationClass of OPERATION_CLASSES) {
    const symbol = Symbol.for(OperationClass.name);

    container.bind(symbol).toDynamicValue(() => {
      const httpClient = container.get<HttpClient>(TYPES.HttpClient);
      const cacheManager = container.get<CacheManager>(TYPES.CacheManager);
      const loggerInstance = container.get<Logger>(TYPES.Logger);
      const configInstance = container.get<ServerConfig>(TYPES.ServerConfig);
      return new OperationClass(httpClient, cacheManager, loggerInstance, configInstance);
    });
  }
}
```

**Стало:**
```typescript
function bindOperations(container: Container): void {
  for (const OperationClass of OPERATION_CLASSES) {
    const symbol = Symbol.for(OperationClass.name);

    container.bind(symbol).toDynamicValue(() => {
      const httpClient = container.get<HttpClient>(TYPES.HttpClient);
      const cacheManager = container.get<CacheManager>(TYPES.CacheManager);
      const loggerInstance = container.get<Logger>(TYPES.Logger);

      // Проверяем, нужен ли ParallelExecutor для этой операции
      // (только для batch-операций: GetIssuesOperation)
      const needsParallelExecutor = OperationClass.name === 'GetIssuesOperation';

      if (needsParallelExecutor) {
        const parallelExecutor = container.get<ParallelExecutor>(TYPES.ParallelExecutor);
        return new OperationClass(httpClient, cacheManager, loggerInstance, parallelExecutor);
      } else {
        return new OperationClass(httpClient, cacheManager, loggerInstance);
      }
    });
  }
}
```

**Добавить импорт:**
```typescript
import { ParallelExecutor } from '@infrastructure/async/parallel-executor.js';
```

### 6. Обновить тесты

**Файл:** `tests/unit/tracker_api/api_operations/issue/get-issues.operation.test.ts`

**Найди создание operation и обнови:**

**Было:**
```typescript
const mockConfig: ServerConfig = {
  maxBatchSize: 200,
  maxConcurrentRequests: 5,
  // ... другие поля
};

const operation = new GetIssuesOperation(
  mockHttpClient,
  mockCacheManager,
  mockLogger,
  mockConfig
);
```

**Стало:**
```typescript
const mockParallelExecutor = new ParallelExecutor(mockLogger, {
  maxBatchSize: 200,
  maxConcurrentRequests: 5,
});

const operation = new GetIssuesOperation(
  mockHttpClient,
  mockCacheManager,
  mockLogger,
  mockParallelExecutor
);
```

---

## 🧪 Критерии готовности

- [ ] `ParallelExecutor` зарегистрирован в `container.ts` как Singleton
- [ ] `TYPES.ParallelExecutor` добавлен в `types.ts`
- [ ] `GetIssuesOperation` принимает `ParallelExecutor` в конструкторе
- [ ] `GetIssuesOperation` НЕ зависит от `ServerConfig`
- [ ] `bindOperations()` инъектирует `ParallelExecutor` для batch-операций
- [ ] Тесты обновлены и проходят
- [ ] `npm run build` успешен
- [ ] `npm run test:unit` проходит
- [ ] `npm run validate` проходит

---

## 🔧 Команды для проверки

```bash
# 1. TypeScript компиляция
npm run build

# 2. Unit тесты
npm run test:unit

# 3. Полная валидация
npm run validate
```

---

## 📝 После выполнения

1. **Закоммитить изменения:**
   ```bash
   git add src/composition-root/ src/tracker_api/ src/infrastructure/ tests/
   git commit -m "refactor(operations): использовать shared ParallelExecutor через DI

   Изменения:
   - ParallelExecutor зарегистрирован как Singleton в DI контейнере
   - GetIssuesOperation принимает ParallelExecutor через конструктор
   - Убрана зависимость от ServerConfig в операциях

   Преимущества:
   - Соблюдение ISP (не зависим от полного ServerConfig)
   - DRY (ParallelExecutor создаётся один раз)
   - Централизованное управление concurrency"
   ```

2. **Удалить этот файл:**
   ```bash
   rm -rf .continuation-prompts/03-refactor-shared-parallel-executor
   ```

3. **Запушить в feature branch:**
   ```bash
   git push -u origin claude/refactor-shared-parallel-executor-<session-id>
   ```

---

## ⚠️ Важные замечания

- **Только GetIssuesOperation** использует ParallelExecutor сейчас
- Если добавишь другие batch-операции — обнови `needsParallelExecutor` проверку
- **Singleton** — ParallelExecutor создаётся один раз и переиспользуется
- **НЕ изменяй логику** ParallelExecutor — только инъекцию
