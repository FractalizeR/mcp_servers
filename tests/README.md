# Архитектура тестирования

Этот документ описывает структуру и принципы тестирования в проекте yandex-tracker-mcp.

## 📁 Структура тестов

Тесты организованы по типам и зеркалируют структуру `src/`:

```
tests/
├── unit/                     # Unit тесты (зеркалируют src/)
│   ├── infrastructure/       # Тесты инфраструктурных компонентов
│   ├── mcp/                  # Тесты MCP слоя (tools, utils, registry)
│   └── tracker_api/          # Тесты API слоя (operations, facade, entities)
│
├── integration/              # Интеграционные тесты (зеркалируют src/)
│   ├── helpers/
│   │   ├── mcp-client.ts
│   │   ├── mock-server.ts
│   │   ├── fixture-generator.ts  # Старый (deprecated)
│   │   └── template-based-generator.ts  # Актуальный
│   ├── templates/            # JSON шаблоны
│   │   ├── issue.json
│   │   ├── user.json
│   │   └── README.md
│   └── mcp/                  # End-to-end тесты MCP tools
│       └── tools/
│           └── api/
│               └── issues/
│                   └── get/
│                       └── get-issues.tool.integration.test.ts
│
├── e2e/                      # End-to-end тесты
│
└── TESTING.md                # Этот файл
```

## 🎯 Типы тестов

### Unit тесты

**Путь:** `tests/unit/`
**Запуск:** `npm test` или `npm run test:unit`

**Назначение:**
- Тестирование изолированных компонентов (классов, функций)
- Использование моков для всех зависимостей
- Быстрое выполнение (миллисекунды на тест)

**Покрытие:**
- Минимум **80%** (branches, functions, lines, statements)
- Проверяется автоматически в `npm run validate`

**Пример структуры:**
```
tests/unit/mcp/tools/api/issues/get/get-issues.tool.test.ts
         ↓ зеркалирует
src/mcp/tools/api/issues/get/get-issues.tool.ts
```

### Интеграционные тесты

**Путь:** `tests/integration/`
**Запуск:** `npm run test:integration`

**Назначение:**
- Тестирование взаимодействия компонентов
- End-to-end flow: `MCP Client → ToolRegistry → Tool → Operation → HttpClient → API (mock)`
- Использование реального DI контейнера
- Mock только внешних HTTP запросов (через axios adapter)

**Структура также зеркалирует `src/`:**
```
tests/integration/mcp/tools/api/issues/get/get-issues.tool.integration.test.ts
         ↓ зеркалирует
src/mcp/tools/api/issues/get/get-issues.tool.ts
```

**Helpers:**
- `@integration/helpers/mcp-client.ts` — тестовый клиент для вызова tools
- `@integration/helpers/mock-server.ts` — настройка HTTP моков (axios adapter)
- `@integration/helpers/template-based-generator.ts` — template-based генератор (актуальный)
- `@integration/helpers/fixture-generator.ts` — старый генератор (deprecated)

## 🔧 Helpers для интеграционных тестов

### TestMCPClient

Тестовый MCP клиент для прямого взаимодействия с `ToolRegistry`:

```typescript
import { createTestClient } from '@integration/helpers/mcp-client.js';

const client = createTestClient({
  logLevel: 'silent',
});

const result = await client.callTool('yandex_tracker_get_issues', {
  issueKeys: ['QUEUE-1'],
});
```

**Возможности:**
- ✅ Прямой вызов tools без запуска MCP сервера
- ✅ Использование реального DI контейнера
- ✅ Переопределение конфигурации для тестов
- ✅ Доступ к контейнеру и ToolRegistry для продвинутых тестов

### MockServer

Mock HTTP сервера на базе кастомного axios adapter для имитации API Яндекс.Трекер:

```typescript
import { createMockServer } from '@integration/helpers/mock-server.js';

const mockServer = createMockServer(client.getHttpClient().getAxiosInstance());

// Успешный ответ с автоматически генерированными данными
mockServer.mockGetIssueSuccess('QUEUE-1');

// Ошибка 404
mockServer.mockGetIssue404('NONEXISTENT-1');

// Проверка выполнения всех моков
mockServer.assertAllRequestsDone();

// Очистка моков
mockServer.cleanup();
```

**Возможности:**
- ✅ Автоматическая генерация рандомизированных фикстур
- ✅ Методы для успешных ответов и ошибок (404, 401, 403)
- ✅ Поддержка batch-запросов
- ✅ Проверка выполнения всех замоканных запросов

### Template-Based Generator

**Современный подход:** рандомизация по правилам на основе JSON шаблонов.

```typescript
import { generateIssue } from '@integration/helpers/template-based-generator.js';

// Базовый шаблон + переопределение полей
const issue = generateIssue({
  overrides: {
    summary: 'Test issue',
    status: { key: 'open' }
  }
});
```

**Преимущества:**
- ✅ Чувствительные данные рандомизируются автоматически
- ✅ JSON шаблоны легко поддерживать
- ✅ Умные правила (emails, URLs, ObjectIds)
- ✅ Масштабируемость: добавил шаблон → получил генератор

**Доступные генераторы:**
- `generateIssue(options)` — задача
- `generateUser(options)` — пользователь
- `generateError404()` — ошибка 404
- `generateError401()` — ошибка 401
- `generateError403()` — ошибка 403

**Подробнее:** `tests/integration/templates/README.md`

## ✅ Принципы написания интеграционных тестов

### 1. Структура теста (AAA Pattern)

```typescript
it('должен успешно получить одну задачу по ключу', async () => {
  // Arrange (подготовка)
  const issueKey = 'QUEUE-1';
  mockServer.mockGetIssueSuccess(issueKey);

  // Act (действие)
  const result = await client.callTool('yandex_tracker_get_issues', {
    issueKeys: [issueKey],
  });

  // Assert (проверка)
  expect(result.isError).toBeUndefined();
  expect(result.content).toHaveLength(1);

  const responseWrapper = JSON.parse(result.content[0]!.text);
  const response = responseWrapper.data;

  expect(response.issues).toHaveLength(1);
  expect(response.issues[0].key).toBe(issueKey);

  mockServer.assertAllRequestsDone();
});
```

### 2. НЕ проверяй конкретные значения из фикстур

**❌ Плохо:**
```typescript
expect(issue.summary).toBe('Тестовое Саммари задачи');
expect(issue.status.key).toBe('cancelled');
```

**✅ Хорошо:**
```typescript
expect(issue).toHaveProperty('summary');
expect(issue).toHaveProperty('status');
expect(issue.status).toHaveProperty('key');
expect(issue.status).toHaveProperty('display');
```

**Почему:** Фикстуры рандомизированы для предотвращения утечки данных.

### 3. Проверяй структуру и поведение

Проверяй:
- ✅ Структуру ответа (наличие полей)
- ✅ Количество элементов
- ✅ Соответствие ключей задач
- ✅ Порядок элементов (если важен)
- ✅ Обработку ошибок

Не проверяй:
- ❌ Конкретные значения полей (summary, display и т.д.)
- ❌ Конкретные ID, UID, даты

### 4. Используй `@integration` алиас

**✅ Правильно:**
```typescript
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
```

**❌ Неправильно:**
```typescript
import { createTestClient } from '../../../helpers/mcp-client.js';
```

### 5. Cleanup после каждого теста

```typescript
afterEach(() => {
  mockServer.cleanup(); // ОБЯЗАТЕЛЬНО
});
```

## 🚀 Запуск тестов

```bash
# Все тесты (unit + integration + e2e)
npm test

# Только unit тесты
npm run test:unit

# Только интеграционные тесты
npm run test:integration

# E2E тесты запускаются через npm test
# (нет отдельной команды test:e2e)

# С покрытием
npm run test:coverage

# Полная валидация (lint + typecheck + test + depcruise + build)
npm run validate
```

## 📊 Coverage

Требования к покрытию (настроено в `vitest.config.ts`):

- Branches: ≥80%
- Functions: ≥80%
- Lines: ≥80%
- Statements: ≥80%

**Важно:** Coverage считается для всего кода из `src/`, независимо от типа теста (unit/integration/e2e).
Конфигурация: `vitest.config.ts` → `coverage.include: ['src/**/*.ts']`

## 🔒 Изоляция тестов и параллельное выполнение

### Принципы изоляции

Все тесты в проекте **ДОЛЖНЫ** выполняться параллельно и независимо друг от друга.

**Конфигурация Vitest обеспечивает:**

```typescript
// vitest.config.ts
test: {
  pool: 'threads',        // Worker threads для параллелизма
  maxWorkers: 8,          // До 8 параллельных workers
  isolate: true,          // Каждый тестовый файл в отдельной среде
  sequence: {
    shuffle: true,        // Случайный порядок каждый раз
  },
}
```

### Правила написания тестов

#### ✅ ОБЯЗАТЕЛЬНО

1. **Изолируй side effects через `beforeEach`/`afterEach`:**

```typescript
describe('MyComponent', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Создаём изолированное окружение для КАЖДОГО теста
    tempDir = await mkdtemp(join(tmpdir(), 'test-'));
  });

  afterEach(async () => {
    // Очищаем после КАЖДОГО теста
    await rm(tempDir, { recursive: true, force: true });
  });
});
```

2. **Файловые операции ТОЛЬКО во временные директории:**

```typescript
// ✅ ПРАВИЛЬНО
const tempDir = await mkdtemp(join(tmpdir(), 'test-'));
await writeFile(join(tempDir, 'test.json'), data);

// ❌ НЕПРАВИЛЬНО (модификация проекта)
await writeFile('./logs/test.log', data);
```

3. **HTTP моки очищай после каждого теста:**

```typescript
describe('API tests', () => {
  let client: TestMCPClient;
  let mockServer: MockServer;

  beforeEach(async () => {
    client = await createTestClient();
    mockServer = createMockServer(client.getAxiosInstance());
  });

  afterEach(() => {
    mockServer.cleanup(); // Восстанавливает оригинальный adapter и очищает моки
  });
});
```

4. **Избегай глобальных переменных вне `describe()`:**

```typescript
// ❌ НЕПРАВИЛЬНО (shared state между файлами)
let globalCounter = 0;

describe('Test', () => {
  it('increments', () => {
    globalCounter++; // Race condition при параллелизме!
  });
});

// ✅ ПРАВИЛЬНО (изолированное состояние)
describe('Test', () => {
  let localCounter: number;

  beforeEach(() => {
    localCounter = 0;
  });

  it('increments', () => {
    localCounter++;
  });
});
```

#### ❌ ЗАПРЕЩЕНО

- Модификация файлов в директории проекта (`src/`, `tests/`, etc.)
- Shared state между тестовыми файлами через глобальные переменные
- `beforeAll`/`afterAll` с созданием ресурсов (используй `beforeEach`/`afterEach`)
- Зависимости от порядка выполнения тестов
- Моки, которые не очищаются в `afterEach`

### Проверка изоляции

**Автоматическая проверка:**

Тесты всегда выполняются в **случайном порядке** (`sequence.shuffle: true`).
Если тест падает при случайном порядке — значит есть зависимость от других тестов.

**Ручная проверка:**

```bash
# Запустить тесты с уникальным seed (основан на текущем времени)
npm run test:isolation

# Запустить тесты с фиксированным seed для воспроизведения проблемы
npm test -- --sequence.seed=12345

# Запустить несколько раз подряд
npm test && npm test && npm test
```

### Отладка проблем с изоляцией

**Признаки нарушения изоляции:**

1. Тест проходит при запуске отдельно, но падает при `npm test`
2. Тесты проходят в одном порядке, но падают в другом
3. Intermittent failures (тест иногда падает, иногда проходит)

**Решение:**

1. Проверь `beforeEach`/`afterEach` — очищается ли состояние
2. Ищи глобальные переменные и shared state
3. Проверь моки — вызывается ли `cleanup()`
4. Убедись, что файловые операции используют временные директории

### Примеры правильной изоляции

**Пример 1: Интеграционный тест с файлами**

```typescript
// tests/integration/infrastructure/logging/logger.integration.test.ts
describe('Logger Integration Tests', () => {
  let testLogsDir: string;

  beforeEach(async () => {
    // Уникальная временная директория для КАЖДОГО теста
    testLogsDir = await mkdtemp(join(tmpdir(), 'logger-integration-test-'));
  });

  afterEach(async () => {
    // Полная очистка после теста
    await rm(testLogsDir, { recursive: true, force: true });
  });

  it('должен создать лог-файл', async () => {
    const logger = new Logger({ logsDir: testLogsDir });
    logger.info('Test message');

    const files = await readdir(testLogsDir);
    expect(files.length).toBeGreaterThan(0);
  });
});
```

**Пример 2: HTTP моки**

```typescript
// tests/integration/mcp/tools/api/issues/get/get-issues.tool.integration.test.ts
describe('get-issues integration tests', () => {
  let client: TestMCPClient;
  let mockServer: MockServer;

  beforeEach(async () => {
    client = await createTestClient();
    mockServer = createMockServer(client.getAxiosInstance());
  });

  afterEach(() => {
    mockServer.cleanup(); // Восстанавливает оригинальный adapter
  });

  it('должен вернуть задачу', async () => {
    mockServer.mockGetIssueSuccess('QUEUE-1');

    const result = await client.callTool('yandex_tracker_get_issues', {
      issueKeys: ['QUEUE-1'],
    });

    expect(result.issues).toHaveLength(1);
  });
});
```

## 🔍 CI/CD

В CI/CD pipeline автоматически запускается:

```bash
npm run validate
```

Который включает:
1. ESLint (lint)
2. TypeScript (typecheck)
3. Vitest (unit + integration тесты)
4. dependency-cruiser (архитектурные правила)
5. Build проверка

## 🎨 Mocking Best Practices

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

## 📚 Дополнительные материалы

- **Документация Vitest:** https://vitest.dev/
- **axios-mock-adapter (HTTP mocking):** https://github.com/ctimmerm/axios-mock-adapter
- **InversifyJS (DI):** https://inversify.io/
- **API Яндекс.Трекер v3:** `yandex_tracker_client/` (Python SDK)
