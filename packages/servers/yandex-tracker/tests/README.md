# Архитектура тестирования

Этот документ описывает структуру и принципы тестирования в проекте yandex-tracker-mcp.

**Что именно должно быть проверено:** общий канон для всех MCP-серверов монорепо —
[packages/servers/TESTING_STRATEGY.md](../../TESTING_STRATEGY.md); специфика Трекера
(песочница `TEST`, версии API v2/v3, известные классы дефектов) —
[TESTING_STRATEGY.md](./TESTING_STRATEGY.md).

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
├── workflows/                # Workflow integration тесты
│   └── full-issue-lifecycle.integration.test.ts
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

### Workflow Integration тесты

**Путь:** `tests/workflows/`
**Запуск:** Автоматически через `npm test`

**Назначение:**
- Тестирование комплексных сценариев работы с задачами
- Проверка взаимодействия нескольких tools в рамках одного workflow
- Использование MockServer для всех API вызовов

**Примеры workflow:**
- `full-issue-lifecycle.integration.test.ts` — полный жизненный цикл задачи (создание → комментарии → чеклисты → вложения → связи → переходы → changelog)

**Отличия от обычных integration тестов:**
- Покрывают последовательность из нескольких операций
- Тестируют реальные пользовательские сценарии
- Проверяют корректность работы tools при совместном использовании
- Не требуют реальных credentials (используют моки)

## 🔧 Helpers для интеграционных тестов

### TestMCPClient

Тестовый MCP клиент для прямого взаимодействия с `ToolRegistry`.

**Возможности:**
- Прямой вызов tools без запуска MCP сервера
- Использование реального DI контейнера
- Переопределение конфигурации для тестов

**Пример:** См. любой файл в `tests/integration/mcp/tools/`

### MockServer

Mock HTTP сервера для имитации API Яндекс.Трекер.

**Возможности:**
- Автоматическая генерация рандомизированных фикстур
- Методы для успешных ответов и ошибок (404, 401, 403)
- Проверка выполнения всех замоканных запросов

**Пример:** См. `tests/integration/mcp/tools/api/issues/get/get-issues.tool.integration.test.ts`

### Template-Based Generator

Рандомизация фикстур на основе JSON шаблонов.

**Преимущества:**
- Чувствительные данные рандомизируются автоматически
- JSON шаблоны легко поддерживать
- Умные правила (emails, URLs, ObjectIds)

**Доступные генераторы:** `generateIssue()`, `generateUser()`, `generateError404/401/403()`

**Подробнее:** `tests/integration/templates/README.md`

### Schema-Definition Matcher

Helper для проверки соответствия Zod Schema ↔ MCP Definition.

**Назначение:**
- Автоматическая проверка, что MCP definition корректно генерируется из Zod schema
- Предотвращение багов schema-definition mismatch
- Используется в unit-тестах инструментов и smoke-тестах

**Доступные функции:**
- `expectDefinitionMatchesSchema(definition, schema)` — проверяет соответствие schema ↔ definition
- `validateGeneratedDefinition(definition)` — проверяет корректность структуры definition
- `expectDefinitionFullyValid(definition, schema)` — полная проверка (структура + соответствие)
- `getValidationResult(definition, schema)` — возвращает результат валидации без выбрасывания ошибки

**Пример использования в unit-тесте:**
```typescript
import { expectDefinitionMatchesSchema } from '#helpers/schema-definition-matcher.js';
import { GetQueueFieldsParamsSchema } from '#tools/api/queues/get-queue-fields.schema.js';

it('должен генерировать definition, соответствующий Zod schema', () => {
  const tool = new GetQueueFieldsTool(mockFacade, mockLogger);
  const definition = tool.getDefinition();

  // Проверяем, что definition соответствует schema
  expectDefinitionMatchesSchema(definition.inputSchema, GetQueueFieldsParamsSchema);
});
```

**Расположение:** `tests/helpers/schema-definition-matcher.ts`

**Smoke тесты:**
- `tests/smoke/definition-generation.smoke.test.ts` — проверяет все инструменты на корректность генерации definition

## ✅ Принципы написания интеграционных тестов

### 1. Структура теста (AAA Pattern)

- **Arrange** — подготовка (моки, данные)
- **Act** — выполнение действия
- **Assert** — проверка результата

**Пример:** См. `tests/integration/mcp/tools/api/issues/get/get-issues.tool.integration.test.ts`

### 2. Проверяй структуру, НЕ значения

| Проверяй | НЕ проверяй |
|----------|-------------|
| Структуру ответа (поля) | Конкретные значения (summary, display) |
| Количество элементов | Конкретные ID, UID, даты |
| Соответствие ключей задач | - |

**Почему:** Фикстуры рандомизированы для предотвращения утечки данных.

### 3. Используй `@integration` алиас

```typescript
import { createTestClient } from '@integration/helpers/mcp-client.js';
```

### 4. Cleanup после каждого теста

```typescript
afterEach(() => mockServer.cleanup());
```

## 🏭 Фабрика интеграционного теста инструмента

**Новый интеграционный тест инструмента пишется только через фабрику.** `MockServer` остаётся
под 33 тестами, написанными до неё; новые на него не пишутся.

Зачем: обязательный состав кейсов (`packages/servers/TESTING_STRATEGY.md` §7) раньше был
декларацией в документе, и happy path на 15 строк был неотличим от полного теста. У фабрики поля
обязательны по типу — тест без объявленной версии пути или типа постранички **не компилируется**.
Барьер даёт `npm run typecheck:tests`, а не доверие к автору.

### Две формы

| Форма | Для чего | Что объявляется |
|---|---|---|
| `describeToolIntegration` | инструменты, делающие HTTP-запросы | `expectedRequests` (метод/путь/версия), `happyPath`, `invalidInput`, `errors`, `batch`, `pagination`, `warnings` |
| `describeNoHttpToolIntegration` | инструменты без запросов вовсе (`demo`, `get_issue_urls`) | `tool`, `happyPath`, опционально `invalidInput` |

Вторая форма — замена первой целиком, а не её расширение: у таких инструментов `errors`, `batch`
и `pagination` не «не проверены», а физически неприменимы, и требовать их значит вынуждать
написать фиктивный кейс. Матрица покрытия различает формы и даёт им разные значения клеток.

`batch: 'not-applicable'` и `pagination: 'none'` — не отговорки: фабрика сверяет их с
`outputDataSchema` инструмента и роняет suite, если в схеме есть `pagination` или
`successful`/`failed`. Соврать нельзя.

**Образец:** `tests/integration/tools/api/boards/create-board.tool.integration.test.ts`.

### Особенные кейсы рядом с фабрикой

Многоступенчатые потоки (`download_attachment` и
`get_thumbnail` — вторая ступень по значениям первого ответа, `transition_issue` — `_execute`→GET)
в шаблон не укладываются и не должны. Пишутся обычными `it()`, но **не с нуля**:

- `useToolIntegrationContext()` — вызывается один раз на верхнем уровне своего `describe()`,
  регистрирует `beforeEach`/`afterEach` и отдаёт `{ client, api }`. Читать их можно внутри `it()`,
  но не в теле `describe()`: до отработавшего `beforeEach` они пусты. Через него же приходит
  `retryAttempts: 0` — без этого незаявленный запрос уходит в ретраи и выглядит сбоем сети
  (замерено: 7019 мс против 7 мс);
- `assertMatchesOutputSchema(result, SomeOutputDataSchema)` — проверяет форму на **обеих**
  проекциях ответа (`content[0].text` и `structuredContent`) и возвращает провалидированные
  данные. Ручное дублирование envelope-схемы в тесте — источник разнобоя;
- порядок ожиданий значим: `api.expectRequest(...)` вызывается столько раз и в том порядке, в
  каком запросы реально уходят.

### Чего этот уровень не наблюдает

Ретрай. Упорядоченная очередь ожиданий несовместима с повтором запроса по построению, поэтому
ретраящиеся 5xx и отказ от повтора неидемпотентного POST здесь не проверяются никогда — это
уровень unit-тестов `RetryHandler`. Слепое пятно названо сознательно, чтобы его не искали здесь.

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

Все тесты **ДОЛЖНЫ** выполняться параллельно и независимо друг от друга.

**Конфигурация:** `vitest.config.ts` — `pool: 'threads'`, `maxWorkers: 8`, `isolate: true`, `shuffle: true`

### Правила написания тестов

#### ✅ ОБЯЗАТЕЛЬНО

- Изолируй side effects через `beforeEach`/`afterEach`
- Файловые операции ТОЛЬКО во временные директории (`mkdtemp(join(tmpdir(), 'test-'))`)
- HTTP моки очищай в `afterEach` (`mockServer.cleanup()`)
- Избегай глобальных переменных вне `describe()`

#### ❌ ЗАПРЕЩЕНО

- Модификация файлов в директории проекта (`src/`, `tests/`)
- Shared state между тестовыми файлами
- `beforeAll`/`afterAll` с созданием ресурсов (используй `beforeEach`/`afterEach`)
- Зависимости от порядка выполнения тестов

### Проверка изоляции

**Признаки нарушения:**
- Тест проходит отдельно, но падает при `npm test`
- Тесты падают в случайном порядке
- Intermittent failures

**Решение:** Проверь `beforeEach`/`afterEach`, глобальные переменные, `cleanup()` моков

**Примеры:** См. любые тесты в `tests/integration/`

## 🔍 CI/CD

В CI/CD pipeline автоматически запускается:

```bash
npm run validate
```

Который включает:
1. ESLint (lint) - включая тесты на `as any`
2. TypeScript (typecheck)
3. Vitest (unit + integration тесты)
4. dependency-cruiser (архитектурные правила)
5. Build проверка

### ESLint для тестов

С Фазы 3-F2 тесты проверяются ESLint на наличие `@typescript-eslint/no-explicit-any`.

**Правило:** Все тесты должны избегать `as any` или использовать с обоснованием:

```typescript
// ❌ ЗАПРЕЩЕНО (ESLint ошибка)
const spy = vi.spyOn(logger['pino'] as any, 'info');

// ✅ ДОПУСТИМО (с объяснением)
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Spy на приватное поле для проверки вызовов
const spy = vi.spyOn(logger['pino'] as any, 'info');
```

**Проверка:** `npm run lint` (теперь включает тесты)

## 🎨 Mocking Best Practices

### ❌ Anti-patterns

**НЕ используй:** Неполные моки с `as unknown as` без mock factory

### ⚠️ Обоснованные исключения для `as any`

**Допустимо ТОЛЬКО:**
1. Spy на приватные методы
2. Замена приватных полей для unit тестирования
3. Намеренно невалидные значения для тестов валидации
4. Доступ к опциональным полям для проверки

**ВАЖНО:** Каждое `as any` ДОЛЖНО иметь комментарий `eslint-disable-next-line` с объяснением.

### ✅ Best Practices

**Используй Mock Factories:**
```typescript
import {
  createMockLogger,      // Logger с всеми методами
  createMockHttpClient,  // HttpClient
  createMockFacade,      // YandexTrackerFacade (partial)
  createPartialMock,     // Generic partial mock helper
} from '@tests/helpers/mock-factories.js';
```

**Примеры:** См. любые unit тесты в `tests/unit/`

## 🔌 DI Testing Patterns

### Unit тесты (без DI контейнера)

**Используй прямую инъекцию:**
```typescript
import { createMockLogger, createMockFacade } from '#helpers/mock-factories.js';

it('should execute tool logic', () => {
  const mockLogger = createMockLogger();
  const mockFacade = createMockFacade();
  const tool = new GetIssuesTool(mockFacade, mockLogger);

  // Test implementation
});
```

**Плюсы:** Быстрое выполнение, полный контроль над моками, изоляция
**Минусы:** Не тестирует реальную DI конфигурацию

### Integration тесты (с DI контейнером)

**Используй TestMCPClient (реальный контейнер):**
```typescript
import { createTestClient } from '#integration/helpers/mcp-client.js';
import { MockServer } from '#integration/helpers/mock-server.js';

it('should work with real DI container', async () => {
  const mockServer = new MockServer();
  mockServer.mockGetIssues(['KEY-1'], [generateIssue({ key: 'KEY-1' })]);

  const client = createTestClient({
    tracker: { orgId: 'test', oauthToken: 'test' }
  });

  const result = await client.callTool('get_issues', { keys: ['KEY-1'], fields: ['key'] });
  expect(result.content[0]?.text).toBeDefined();
});
```

**Плюсы:** Тестирует реальную DI конфигурацию, обнаруживает проблемы с регистрацией
**Минусы:** Медленнее unit тестов

### Contract тесты (DI регистрация)

**Проверка корректности регистрации:**
```typescript
// tests/composition-root/container.contract.test.ts
import { createContainer } from '#composition-root/container.js';

it('should resolve all tools', () => {
  const container = createContainer({ tracker: {...} });
  const tools = TOOL_CLASSES.map(ToolClass => container.get(ToolClass));

  tools.forEach(tool => {
    expect(tool).toBeDefined();
    expect(tool.getDefinition()).toBeDefined();
  });
});
```

**Детали:** См. `tests/composition-root/` для примеров contract тестов

**Best practices:**
- Unit тесты: минимальная настройка, максимальная изоляция
- Integration тесты: реальный DI + моки HTTP
- Contract тесты: проверка регистрации без вызова логики

## 📚 Дополнительные материалы

- **Документация Vitest:** https://vitest.dev/
- **axios-mock-adapter (HTTP mocking):** https://github.com/ctimmerm/axios-mock-adapter
- **InversifyJS (DI):** https://inversify.io/
- **API Яндекс.Трекер v3:** `yandex_tracker_client/` (Python SDK)
