# Этап 9: Улучшение типизации моков

**Приоритет:** 🟢 БУДУЩЕЕ
**Estimate:** 1 день
**Impact:** LOW
**Effort:** LOW

---

## 📊 Текущее состояние

**Проблема:** Многие тесты используют частичные моки с `as unknown as Type`, что обходит type checking.

```typescript
// Текущий подход
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
} as unknown as Logger; // ❌ Обход type checking
```

---

## 🎯 Цели

1. Улучшить типобезопасность моков
2. Упростить создание моков
3. Стандартизировать подход к моканию

---

## 📋 План

### Шаг 1: Расширить Mock Factories (2-3 часа)

**Обновить:** `tests/helpers/mock-factories.ts`

```typescript
// tests/helpers/mock-factories.ts
import { vi } from 'vitest';
import type { Logger } from '@infrastructure/logging/logger.js';
import type { HttpClient } from '@infrastructure/http/client/http-client.js';
import type { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';

/**
 * Создать полную mock для Logger
 */
export function createMockLogger(overrides?: Partial<Logger>): Logger {
  const logger: Logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => createMockLogger()), // Рекурсивно
    ...overrides,
  };

  return logger;
}

/**
 * Создать mock для HttpClient
 */
export function createMockHttpClient(overrides?: Partial<HttpClient>): HttpClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
    ...overrides,
  } as HttpClient;
}

/**
 * Создать mock для YandexTrackerFacade
 */
export function createMockFacade(overrides?: Partial<YandexTrackerFacade>): YandexTrackerFacade {
  return {
    getIssues: vi.fn(),
    findIssues: vi.fn(),
    createIssue: vi.fn(),
    updateIssue: vi.fn(),
    transitionIssue: vi.fn(),
    getIssueChangelog: vi.fn(),
    getIssueTransitions: vi.fn(),
    ping: vi.fn(),
    ...overrides,
  } as YandexTrackerFacade;
}

/**
 * Создать mock для ParallelExecutor
 */
export function createMockParallelExecutor(): ParallelExecutor {
  return {
    executeParallel: vi.fn(),
  } as ParallelExecutor;
}
```

### Шаг 2: Опция - vitest-mock-extended (2 часа)

**Установка:**
```bash
npm install -D vitest-mock-extended
```

**Использование:**
```typescript
import { mock } from 'vitest-mock-extended';

const mockLogger = mock<Logger>(); // ✅ Автоматически все методы

// Настройка моков
mockLogger.debug.mockReturnValue(undefined);
mockLogger.child.mockReturnValue(mockLogger);

// В тестах
expect(mockLogger.debug).toHaveBeenCalledWith('message');
```

**Преимущества:**
- ✅ Автоматическое создание всех методов
- ✅ Полная типобезопасность
- ✅ Меньше boilerplate

**Недостатки:**
- ⚠️ Дополнительная зависимость
- ⚠️ Может быть избыточно для простых моков

### Шаг 3: Миграция существующих тестов (4 часа)

**Стратегия:**
1. Начать с часто используемых моков (Logger, HttpClient)
2. Постепенная миграция (10-20 тестов за раз)
3. Проверять тесты после каждой миграции

**До:**
```typescript
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
} as unknown as Logger;
```

**После:**
```typescript
import { createMockLogger } from '@tests/helpers/mock-factories.js';

const mockLogger = createMockLogger();
```

**Или с vitest-mock-extended:**
```typescript
import { mock } from 'vitest-mock-extended';

const mockLogger = mock<Logger>();
```

### Шаг 4: Документация (1 час)

**Обновить:** `tests/README.md`

```markdown
## Mock Factories

### Доступные factories

```typescript
import {
  createMockLogger,
  createMockHttpClient,
  createMockFacade,
  createMockParallelExecutor,
} from '@tests/helpers/mock-factories.js';

// Использование
const logger = createMockLogger();
const httpClient = createMockHttpClient({
  get: vi.fn().mockResolvedValue({ data: { ... } }),
});
```

### Когда использовать vitest-mock-extended

Для сложных интерфейсов с множеством методов:

```typescript
import { mock } from 'vitest-mock-extended';

const mockComplexService = mock<ComplexService>();
```

### Правила

1. ✅ Используй factory если есть
2. ✅ Используй vitest-mock-extended для новых сложных моков
3. ❌ НЕ используй `as unknown as Type` без factory
```

---

## ✅ Критерии завершения

### Must Have
- [x] Mock factories для основных типов
- [x] 50%+ тестов используют factories
- [x] Документация обновлена

### Should Have
- [x] vitest-mock-extended настроен (optional)
- [x] 80%+ тестов используют factories
- [x] Нет `as unknown as` без factory

### Nice to Have
- [ ] Автоматическая генерация factories
- [ ] ESLint правило для enforcement

---

## 📝 Шаблон для PR

```markdown
# Улучшение типизации моков

## Изменения
- ✅ Созданы mock factories для Logger, HttpClient, Facade
- ✅ Опционально: настроен vitest-mock-extended
- ✅ Мигрировано 50+ тестов на использование factories
- ✅ Обновлена документация

## Метрики
| Метрика | До | После |
|---------|-----|-------|
| Mock factories | 0 | 4+ |
| Тестов с factories | 0% | 60% |
| `as unknown as` | 30+ | 10 |

## Проверка
- [x] `npm test` — все зеленые
- [x] Type checking проходит
- [x] Документация обновлена

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

**Ресурсы:**
- [vitest-mock-extended](https://github.com/marchaos/vitest-mock-extended)
- [TypeScript Mock Best Practices](https://typescript-eslint.io/blog/consistent-type-imports-and-exports-why-and-how/)
