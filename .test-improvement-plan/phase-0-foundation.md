# Фаза 0: Подготовка фундамента

**Ветка:** `claude/test-phase-0-foundation-<session-id>`
**Estimate:** 3-4 часа
**Приоритет:** 🚨 КРИТИЧНО (блокирует ВСЁ)
**Impact:** HIGH
**Effort:** LOW

---

## 🎯 Цель

Создать единый фундамент для всех последующих фаз:
- Mock factories для консистентных моков
- Базовые E2E helpers
- Паттерны для новых тестов
- Документация примеров

**⚠️ ВАЖНО:** Эта фаза ДОЛЖНА быть выполнена ПЕРВОЙ. Все остальные фазы зависят от неё.

---

## 📋 План действий

### Шаг 1: Создать mock-factories.ts (1.5 часа)

**Цель:** Предотвратить `as any` / `as unknown as` в новых тестах

**Файл:** `tests/helpers/mock-factories.ts`

**Код:**

```typescript
// tests/helpers/mock-factories.ts
import { vi } from 'vitest';
import type { Logger } from '@infrastructure/logging/logger.js';
import type { HttpClient } from '@infrastructure/http/client/http-client.js';
import type { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';

/**
 * Создать полностью типизированный mock для Logger
 */
export function createMockLogger(): Logger {
  const childLogger: Logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => childLogger),
  };

  return childLogger;
}

/**
 * Создать mock для HttpClient
 */
export function createMockHttpClient(): HttpClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
  } as unknown as HttpClient;
}

/**
 * Создать partial mock для YandexTrackerFacade
 * Используй это для unit тестов tools
 */
export function createMockFacade(): Partial<YandexTrackerFacade> {
  return {
    getIssues: vi.fn(),
    findIssues: vi.fn(),
    createIssue: vi.fn(),
    updateIssue: vi.fn(),
    transitionIssue: vi.fn(),
    getIssueChangelog: vi.fn(),
    getIssueTransitions: vi.fn(),
  };
}

/**
 * Helper для создания partial mock с явным типом
 */
export function createPartialMock<T>(partial: Partial<T>): T {
  return partial as T;
}
```

**Тест для mock-factories:**

```typescript
// tests/unit/helpers/mock-factories.test.ts
import { describe, it, expect } from 'vitest';
import {
  createMockLogger,
  createMockHttpClient,
  createMockFacade,
} from '../helpers/mock-factories.js';

describe('Mock Factories', () => {
  describe('createMockLogger', () => {
    it('должен создать logger со всеми методами', () => {
      const logger = createMockLogger();

      expect(logger.debug).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.child).toBeDefined();
    });

    it('child() должен возвращать logger', () => {
      const logger = createMockLogger();
      const child = logger.child({});

      expect(child.debug).toBeDefined();
    });
  });

  describe('createMockHttpClient', () => {
    it('должен создать httpClient со всеми методами', () => {
      const client = createMockHttpClient();

      expect(client.get).toBeDefined();
      expect(client.post).toBeDefined();
      expect(client.patch).toBeDefined();
      expect(client.delete).toBeDefined();
    });
  });

  describe('createMockFacade', () => {
    it('должен создать facade с основными методами', () => {
      const facade = createMockFacade();

      expect(facade.getIssues).toBeDefined();
      expect(facade.findIssues).toBeDefined();
      expect(facade.createIssue).toBeDefined();
    });
  });
});
```

**Чек-лист:**
- [ ] Создать `tests/helpers/mock-factories.ts`
- [ ] Реализовать createMockLogger()
- [ ] Реализовать createMockHttpClient()
- [ ] Реализовать createMockFacade()
- [ ] Реализовать createPartialMock()
- [ ] Создать тесты для factories
- [ ] Запустить `npm test tests/unit/helpers/mock-factories.test.ts`

---

### Шаг 2: Создать базовые E2E helpers (1 час)

**Цель:** Подготовить структуру для E2E тестов (Фаза 2)

**Структура:**
```
tests/e2e/
├── helpers/
│   ├── workflow-client.ts       # Wrapper для workflows
│   └── assertion-helpers.ts     # Переиспользуемые assertions
└── README.md                     # Назначение E2E тестов
```

**Файл: workflow-client.ts**

```typescript
// tests/e2e/helpers/workflow-client.ts
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';

/**
 * Helper для E2E workflows с автоматическим извлечением данных
 * Используется в Фазе 2 для упрощения multi-step сценариев
 */
export class WorkflowClient {
  constructor(private client: TestMCPClient) {}

  /**
   * Создать задачу и вернуть её ключ
   */
  async createIssue(params: {
    queue: string;
    summary: string;
    description?: string;
  }): Promise<string> {
    const result = await this.client.callTool(
      'fractalizer_mcp_yandex_tracker_create_issue',
      params
    );

    if (result.isError) {
      throw new Error(`Failed to create issue: ${result.content[0]?.text}`);
    }

    const response = JSON.parse(result.content[0]!.text);
    return response.key;
  }

  /**
   * Получить задачу по ключу
   */
  async getIssue(issueKey: string): Promise<unknown> {
    const result = await this.client.callTool(
      'fractalizer_mcp_yandex_tracker_get_issues',
      { issueKeys: [issueKey] }
    );

    if (result.isError) {
      throw new Error(`Failed to get issue: ${result.content[0]?.text}`);
    }

    const response = JSON.parse(result.content[0]!.text);
    return response.data.results[0];
  }

  // NOTE: Остальные методы будут добавлены в Фазе 2
  // updateIssue(), transitionIssue(), findIssues()
}
```

**Файл: assertion-helpers.ts**

```typescript
// tests/e2e/helpers/assertion-helpers.ts
import { expect } from 'vitest';

/**
 * Проверить что задача имеет базовую структуру
 */
export function assertIssueStructure(issue: unknown): void {
  expect(issue).toHaveProperty('key');
  expect(issue).toHaveProperty('summary');
  expect(issue).toHaveProperty('status');
  expect(issue).toHaveProperty('queue');
}

/**
 * Проверить что задача имеет ожидаемый статус
 */
export function assertIssueStatus(issue: unknown, expectedStatus: string): void {
  expect(issue).toHaveProperty('status');
  expect((issue as { status: { key: string } }).status).toHaveProperty('key');
  expect((issue as { status: { key: string } }).status.key).toBe(expectedStatus);
}

// NOTE: Остальные assertions будут добавлены в Фазе 2
```

**Файл: README.md**

```markdown
# E2E тесты

## Назначение

E2E (End-to-End) тесты проверяют **полные user workflows** через несколько tools.

## Отличие от Integration тестов

| Аспект | Integration | E2E |
|--------|-------------|-----|
| **Scope** | Один tool + зависимости | Workflow через несколько tools |
| **Цель** | Корректность отдельного tool | User scenarios |
| **Пример** | Получить задачу по ключу | Создать → Обновить → Закрыть |

## Структура

```
tests/e2e/
├── workflows/              # E2E сценарии (добавляются в Фазе 2)
├── helpers/
│   ├── workflow-client.ts  # Wrapper для multi-step workflows
│   └── assertion-helpers.ts # Переиспользуемые assertions
└── README.md
```

## Использование helpers

```typescript
import { WorkflowClient } from '../helpers/workflow-client.js';
import { assertIssueStructure } from '../helpers/assertion-helpers.js';

const workflow = new WorkflowClient(client);
const issueKey = await workflow.createIssue({ ... });
const issue = await workflow.getIssue(issueKey);
assertIssueStructure(issue);
```

## Когда добавлять E2E тесты

E2E тесты добавляются в **Фазе 2** после завершения Фазы 0 и Фазы 1.
```

**Чек-лист:**
- [ ] Создать `tests/e2e/helpers/`
- [ ] Создать workflow-client.ts (базовая версия)
- [ ] Создать assertion-helpers.ts (базовые assertions)
- [ ] Создать tests/e2e/README.md
- [ ] Проверить что код компилируется (`npm run build`)

---

### Шаг 3: Обновить tests/README.md с паттернами (30 мин)

**Цель:** Документировать правильные паттерны для новых тестов

**Добавить секцию в tests/README.md:**

```markdown
## Mocking Best Practices

### ❌ Anti-patterns

**НЕ используй в новых тестах:**

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

**Используй в новых тестах (Фазы 1-3):**

1. **Mock factories для стандартных типов**
   ```typescript
   // ✅ ХОРОШО
   import { createMockLogger } from '@tests/helpers/mock-factories.js';
   const mockLogger = createMockLogger();
   ```

2. **Полные моки через factories**
   ```typescript
   // ✅ ХОРОШО
   import { createMockFacade } from '@tests/helpers/mock-factories.js';
   const mockFacade = createMockFacade();
   ```

3. **Partial моки с явным helper**
   ```typescript
   // ✅ ДОПУСТИМО для custom типов
   import { createPartialMock } from '@tests/helpers/mock-factories.js';
   const mock = createPartialMock<MyType>({ method: vi.fn() });
   ```

### Mock Factories

Доступные factories (с Фазы 0):

```typescript
import {
  createMockLogger,      // Logger с всеми методами
  createMockHttpClient,  // HttpClient
  createMockFacade,      // YandexTrackerFacade (partial)
  createPartialMock,     // Generic partial mock helper
} from '@tests/helpers/mock-factories.js';
```

### Примеры

**Unit тест для Tool:**
```typescript
import { createMockFacade, createMockLogger } from '@tests/helpers/mock-factories.js';

const mockFacade = createMockFacade();
const mockLogger = createMockLogger();
const tool = new MyTool(mockFacade as YandexTrackerFacade, mockLogger);
```

**Unit тест для Operation:**
```typescript
import { createMockHttpClient, createMockLogger } from '@tests/helpers/mock-factories.js';

const mockHttpClient = createMockHttpClient();
const mockLogger = createMockLogger();
const operation = new MyOperation(mockHttpClient, mockLogger);
```
```

**Чек-лист:**
- [ ] Открыть `tests/README.md`
- [ ] Добавить секцию "Mocking Best Practices"
- [ ] Добавить примеры anti-patterns
- [ ] Добавить примеры best practices
- [ ] Добавить список доступных factories
- [ ] Проверить форматирование

---

### Шаг 4: Создать пример использования (30 мин)

**Цель:** Показать как использовать новые паттерны

**Создать файл-пример:**

```typescript
// tests/examples/using-mock-factories.example.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMockLogger,
  createMockHttpClient,
  createMockFacade,
} from '@tests/helpers/mock-factories.js';
import type { Logger } from '@infrastructure/logging/logger.js';
import type { HttpClient } from '@infrastructure/http/client/http-client.js';
import type { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';

/**
 * ПРИМЕР: Как использовать mock factories в новых тестах
 * Этот файл показывает правильные паттерны для Фаз 1-3
 */
describe('EXAMPLE: Using Mock Factories', () => {
  let mockLogger: Logger;
  let mockHttpClient: HttpClient;
  let mockFacade: Partial<YandexTrackerFacade>;

  beforeEach(() => {
    // ✅ ПРАВИЛЬНО: Используй factories
    mockLogger = createMockLogger();
    mockHttpClient = createMockHttpClient();
    mockFacade = createMockFacade();
  });

  it('пример использования mockLogger', () => {
    mockLogger.info('test message');

    expect(mockLogger.info).toHaveBeenCalledWith('test message');
  });

  it('пример использования mockFacade', async () => {
    // Setup mock behavior
    mockFacade.getIssues = vi.fn().mockResolvedValue([
      { key: 'TEST-1', summary: 'Test' },
    ]);

    // Use mock
    const result = await mockFacade.getIssues!(['TEST-1']);

    // Verify
    expect(result).toHaveLength(1);
    expect(mockFacade.getIssues).toHaveBeenCalledWith(['TEST-1']);
  });
});
```

**Чек-лист:**
- [ ] Создать `tests/examples/using-mock-factories.example.test.ts`
- [ ] Добавить примеры для каждого factory
- [ ] Запустить тест: `npm test tests/examples/`
- [ ] Проверить что всё работает

---

## ✅ Критерии завершения

### Must Have
- [x] `tests/helpers/mock-factories.ts` создан и протестирован
- [x] E2E helpers созданы (workflow-client.ts, assertion-helpers.ts)
- [x] `tests/README.md` обновлен с примерами
- [x] Пример-файл создан и работает
- [x] `npm run build` проходит без ошибок
- [x] `npm test` проходит (все тесты зелёные)

### Should Have
- [x] Тесты для mock-factories.ts
- [x] E2E README.md создан
- [x] Все imports используют правильные пути

### Nice to Have
- [ ] Дополнительные примеры в tests/examples/
- [ ] JSDoc комментарии для всех helpers

---

## 📝 Шаблон для PR

```markdown
# Фаза 0: Подготовка фундамента для тестов

## Изменения
- ✅ Создан `tests/helpers/mock-factories.ts`
  - createMockLogger()
  - createMockHttpClient()
  - createMockFacade()
  - createPartialMock()
- ✅ Созданы E2E helpers
  - tests/e2e/helpers/workflow-client.ts
  - tests/e2e/helpers/assertion-helpers.ts
  - tests/e2e/README.md
- ✅ Обновлен `tests/README.md` с best practices
- ✅ Создан пример использования

## Цель
Подготовить единый фундамент для Фаз 1-3:
- Предотвратить `as any` anti-pattern
- Унифицировать создание моков
- Подготовить структуру для E2E тестов

## Проверка
- [x] `npm run build` — успешно
- [x] `npm test` — все тесты зелёные
- [x] Примеры компилируются

## Следующие фазы
После мержа этого PR можно начинать:
- Фаза 1A: Skip tests
- Фаза 1B: CLI testing
- Фаза 1C: Coverage improvement

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 🚨 Важные замечания

### ⚠️ Не добавляй новые тесты
Фаза 0 создаёт только **инфраструктуру**. Новые тесты добавляются в Фазах 1-3.

### ⚠️ Не меняй существующие тесты
Существующие тесты мигрируются на новые паттерны в Фазе 3-F2 (опционально).

### ⚠️ Проверь перед коммитом
```bash
# Компиляция
npm run build

# Тесты
npm test

# Линтинг
npm run lint
```

---

**Следующая фаза:** [phase-1-critical-parallel.md](./phase-1-critical-parallel.md) (после мержа этой ветки)
