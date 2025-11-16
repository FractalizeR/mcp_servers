# Этап 5: Рефакторинг доступа к приватным полям

**Приоритет:** 🟡 ВАЖНО
**Estimate:** 1 день
**Impact:** LOW
**Effort:** LOW

---

## 📊 Текущее состояние

**Проблема:** Некоторые тесты используют `as any` для доступа к приватным полям, что обходит type safety.

**Примеры:**
```typescript
// tests/unit/tracker_api/api_operations/issue/get-issues.operation.test.ts
mockParallelExecutor = { executeParallel: vi.fn() };
(operation as any).parallelExecutor = mockParallelExecutor; // ❌ Anti-pattern
```

**Риски:**
- ❌ Обход TypeScript type checking
- ❌ Хрупкие тесты (при рефакторинге имени поля тест сломается без предупреждения)
- ❌ Нарушение инкапсуляции

---

## 🎯 Цели

1. Найти все использования `as any` в тестах
2. Рефакторить на dependency injection или публичные методы
3. Улучшить типобезопасность тестов
4. Документировать правильные паттерны

---

## 📋 План действий

### Шаг 1: Поиск проблемных мест (30 мин)

**Команды:**
```bash
# Поиск всех 'as any' в тестах
grep -r "as any" tests/ | grep -v node_modules

# Поиск обращений к приватным полям
grep -r "as any\)\\." tests/ | grep -v node_modules

# Поиск 'as unknown as'
grep -r "as unknown as" tests/ | grep -v node_modules
```

**Создать список:**
```markdown
## Найденные проблемы

### Критичные (обход инкапсуляции)
- [ ] tests/unit/tracker_api/api_operations/issue/get-issues.operation.test.ts
  - `(operation as any).parallelExecutor = ...`
- [ ] tests/unit/tracker_api/api_operations/issue/find-issues.operation.test.ts
  - `(operation as any).parallelExecutor = ...`

### Некритичные (только type casting)
- [ ] tests/unit/mcp/tools/api/issues/get/get-issues.tool.test.ts
  - `mockFacade = {...} as unknown as YandexTrackerFacade`
```

**Чек-лист:**
- [ ] Найти все `as any` в тестах
- [ ] Категоризировать (критичные / некритичные)
- [ ] Приоритизировать

---

### Шаг 2: Рефакторинг приватных полей (4-6 часов)

**Стратегия A: Dependency Injection (РЕКОМЕНДУЕТСЯ)**

Сделать зависимости публичными через конструктор:

**До:**
```typescript
// src/tracker_api/api_operations/issue/get/get-issues.operation.ts
export class GetIssuesOperation extends BaseOperation {
  private parallelExecutor: ParallelExecutor; // ❌ Приватное

  constructor(
    httpClient: HttpClient,
    logger: Logger
  ) {
    super(httpClient, logger);
    this.parallelExecutor = new ParallelExecutor(httpClient, logger);
  }
}

// tests/unit/.../get-issues.operation.test.ts
const operation = new GetIssuesOperation(mockHttpClient, mockLogger);
(operation as any).parallelExecutor = mockParallelExecutor; // ❌
```

**После:**
```typescript
// src/tracker_api/api_operations/issue/get/get-issues.operation.ts
export class GetIssuesOperation extends BaseOperation {
  constructor(
    httpClient: HttpClient,
    logger: Logger,
    private parallelExecutor: ParallelExecutor // ✅ Инжектируется
  ) {
    super(httpClient, logger);
  }
}

// Обновить DI регистрацию
// src/composition-root/definitions/operation-definitions.ts
container.bind<GetIssuesOperation>(TYPES.GetIssuesOperation)
  .toDynamicValue((context) => {
    const httpClient = context.container.get<HttpClient>(TYPES.HttpClient);
    const logger = context.container.get<Logger>(TYPES.Logger);
    const parallelExecutor = context.container.get<ParallelExecutor>(TYPES.ParallelExecutor);

    return new GetIssuesOperation(httpClient, logger, parallelExecutor);
  });

// tests/unit/.../get-issues.operation.test.ts
const mockParallelExecutor = { executeParallel: vi.fn() };
const operation = new GetIssuesOperation(
  mockHttpClient,
  mockLogger,
  mockParallelExecutor as ParallelExecutor // ✅ Явная передача
);
```

**Стратегия B: Публичный setter (только для тестов)**

Если зависимость должна быть приватной в production:

```typescript
// src/tracker_api/api_operations/issue/get/get-issues.operation.ts
export class GetIssuesOperation extends BaseOperation {
  private parallelExecutor: ParallelExecutor;

  // Публичный метод ТОЛЬКО для тестов
  /** @internal Только для тестов */
  setParallelExecutorForTest(executor: ParallelExecutor): void {
    if (process.env['NODE_ENV'] !== 'test') {
      throw new Error('setParallelExecutorForTest can only be used in tests');
    }
    this.parallelExecutor = executor;
  }
}

// tests/unit/.../get-issues.operation.test.ts
const operation = new GetIssuesOperation(mockHttpClient, mockLogger);
operation.setParallelExecutorForTest(mockParallelExecutor); // ✅ Type-safe
```

**Стратегия C: Извлечение в отдельный класс**

Если логика сложная:

```typescript
// До: тяжело тестировать приватный метод
class MyOperation {
  private complexCalculation(data: unknown): number {
    // 50 строк сложной логики
  }
}

// После: отдельный тестируемый класс
class ComplexCalculator {
  calculate(data: unknown): number {
    // 50 строк логики
  }
}

class MyOperation {
  constructor(private calculator: ComplexCalculator) {} // ✅ Инжектируется
}

// Тест calculator отдельно
describe('ComplexCalculator', () => {
  it('should calculate correctly', () => {
    const calculator = new ComplexCalculator();
    expect(calculator.calculate(input)).toBe(expected);
  });
});
```

**Применить к каждому проблемному месту:**

1. **get-issues.operation.ts**
   - [ ] Выбрать стратегию (A, B или C)
   - [ ] Рефакторить код
   - [ ] Обновить DI регистрацию
   - [ ] Обновить тест
   - [ ] Запустить unit тесты

2. **find-issues.operation.ts**
   - [ ] Повторить процесс

3. **Другие файлы** (если найдены)
   - [ ] Повторить процесс

---

### Шаг 3: Улучшение типизации моков (2-3 часа)

**Проблема:**
```typescript
mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
} as unknown as Logger; // ❌ Неполная mock, обход type checking
```

**Решение A: Полная mock (РЕКОМЕНДУЕТСЯ)**

Создать helper для полных моков:

```typescript
// tests/helpers/mock-factories.ts
import { vi } from 'vitest';
import type { Logger } from '@infrastructure/logging/logger.js';

export function createMockLogger(): Logger {
  const childLogger: Logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => childLogger), // ✅ Рекурсивно
  };

  return childLogger;
}

// Использование в тестах
import { createMockLogger } from '@tests/helpers/mock-factories.js';

const mockLogger = createMockLogger(); // ✅ Полностью типизировано
```

**Решение B: Partial mock с проверкой**

Если нужна только часть методов:

```typescript
function createPartialMock<T>(partial: Partial<T>): T {
  return partial as T; // Явный контракт: partial mock
}

const mockLogger = createPartialMock<Logger>({
  debug: vi.fn(),
  info: vi.fn(),
});
```

**Решение C: Библиотека vitest-mock-extended**

```bash
npm install -D vitest-mock-extended
```

```typescript
import { mock } from 'vitest-mock-extended';

const mockLogger = mock<Logger>(); // ✅ Автоматически все методы

mockLogger.debug.mockReturnValue(undefined);
```

**Выбрать подход и применить:**

1. Создать `tests/helpers/mock-factories.ts`
2. Добавить factory для каждого часто мокаемого типа:
   - Logger
   - HttpClient
   - YandexTrackerFacade
3. Обновить существующие тесты
4. Документировать в tests/README.md

**Чек-лист:**
- [ ] Создать mock-factories.ts
- [ ] Добавить createMockLogger()
- [ ] Добавить createMockHttpClient()
- [ ] Добавить createMockFacade()
- [ ] Обновить 10+ тестов для проверки подхода
- [ ] Запустить тесты

---

### Шаг 4: Линтинг правила (1 час)

**Задача:** Предотвратить появление anti-patterns в будущем

**Добавить ESLint правило:**

```javascript
// .eslintrc.cjs
module.exports = {
  rules: {
    // Запретить 'as any' в тестах
    '@typescript-eslint/no-explicit-any': ['error', {
      ignoreRestArgs: false,
      fixToUnknown: true, // Предлагать 'unknown' вместо 'any'
    }],

    // Предупреждение при 'as unknown as'
    '@typescript-eslint/consistent-type-assertions': ['warn', {
      assertionStyle: 'as',
      objectLiteralTypeAssertions: 'allow-as-parameter',
    }],
  },
  overrides: [
    {
      files: ['tests/**/*.ts'],
      rules: {
        // Строже для тестов
        '@typescript-eslint/no-explicit-any': 'error',
      },
    },
  ],
};
```

**Альтернатива: TypeScript strict mode**

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    // Включено в проекте
  }
}
```

**Чек-лист:**
- [ ] Обновить .eslintrc.cjs
- [ ] Запустить `npm run lint` — проверить warnings
- [ ] Исправить все новые warnings
- [ ] Добавить правило в CI

---

### Шаг 5: Документация паттернов (1 час)

**Обновить tests/README.md:**

```markdown
## Mocking Best Practices

### ❌ Anti-patterns

1. **Доступ к приватным полям через `as any`**
   ```typescript
   // ❌ ПЛОХО
   (operation as any).privateField = mockValue;
   ```

2. **Неполные моки с `as unknown as`**
   ```typescript
   // ❌ ПЛОХО
   const mock = { method: vi.fn() } as unknown as ComplexType;
   ```

### ✅ Best Practices

1. **Dependency Injection**
   ```typescript
   // ✅ ХОРОШО: инжектируй зависимости
   const operation = new MyOperation(mockDependency);
   ```

2. **Полные моки через factories**
   ```typescript
   // ✅ ХОРОШО: используй mock factories
   import { createMockLogger } from '@tests/helpers/mock-factories.js';
   const mockLogger = createMockLogger();
   ```

3. **Partial моки с явным контрактом**
   ```typescript
   // ✅ ДОПУСТИМО: если нужна только часть
   function createPartialMock<T>(partial: Partial<T>): T {
     return partial as T;
   }
   ```

### Mock Factories

Используй готовые factories для стандартных типов:

```typescript
import {
  createMockLogger,
  createMockHttpClient,
  createMockFacade,
} from '@tests/helpers/mock-factories.js';

const logger = createMockLogger();
const httpClient = createMockHttpClient();
const facade = createMockFacade();
```
```

**Чек-лист:**
- [ ] Обновить tests/README.md
- [ ] Добавить секцию Mocking Best Practices
- [ ] Добавить примеры anti-patterns
- [ ] Добавить примеры best practices
- [ ] Документировать mock factories

---

## ✅ Критерии завершения

### Must Have
- [x] Все `(x as any).field = ...` заменены на DI или setters
- [x] Mock factories созданы
- [x] ESLint правила добавлены
- [x] Документация обновлена

### Should Have
- [x] 80%+ тестов используют mock factories
- [x] 0 warnings от ESLint
- [x] Все тесты проходят

### Nice to Have
- [ ] Миграция на vitest-mock-extended
- [ ] Автоматическая генерация моков

---

## 🚨 Возможные проблемы

### Проблема 1: DI изменения ломают production код

**Решение:**
- Использовать Стратегию B (setter для тестов)
- Добавить проверку NODE_ENV в setter
- Тщательно тестировать после изменений

### Проблема 2: Слишком много мест для обновления

**Решение:**
- Начать с критичных (обход инкапсуляции)
- Постепенная миграция (1-2 файла в день)
- Создать tracking issue

---

## 📝 Шаблон для PR

```markdown
# Рефакторинг доступа к приватным полям

## Изменения
- ✅ Рефакторинг get-issues.operation: DI для parallelExecutor
- ✅ Создан tests/helpers/mock-factories.ts
- ✅ Обновлены 15+ тестов на использование factories
- ✅ Добавлены ESLint правила
- ✅ Обновлена документация

## Метрики
| Метрика | До | После |
|---------|-----|-------|
| `as any` в тестах | 10+ | 0 |
| `as unknown as` | 30+ | 5 (только partial моки) |
| Mock factories | 0 | 3 |

## Проверка
- [x] `npm run lint` — 0 warnings
- [x] `npm test` — все зеленые
- [x] Документация обновлена

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

**Следующий этап:** [06-important-cli.md](./06-important-cli.md)
