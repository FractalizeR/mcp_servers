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
│   ├── mcp/                  # End-to-end тесты MCP tools
│   │   └── tools/
│   │       └── api/
│   │           └── issues/
│   │               └── get/
│   │                   └── get-issues.tool.integration.test.ts
│   └── helpers/              # Вспомогательные утилиты для интеграционных тестов
│       ├── mcp-client.ts     # Тестовый MCP клиент
│       ├── mock-server.ts    # Mock HTTP сервера (nock)
│       └── fixture-generator.ts  # Генератор рандомизированных данных
│
├── e2e/                      # End-to-end тесты (будущее)
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
- Mock только внешних HTTP запросов (через `nock`)

**Структура также зеркалирует `src/`:**
```
tests/integration/mcp/tools/api/issues/get/get-issues.tool.integration.test.ts
         ↓ зеркалирует
src/mcp/tools/api/issues/get/get-issues.tool.ts
```

**Helpers:**
- `@integration/helpers/mcp-client.ts` — тестовый клиент для вызова tools
- `@integration/helpers/mock-server.ts` — настройка HTTP моков (nock)
- `@integration/helpers/fixture-generator.ts` — генератор тестовых данных

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

Mock HTTP сервера на базе `nock` для имитации API Яндекс.Трекер:

```typescript
import { createMockServer } from '@integration/helpers/mock-server.js';

const mockServer = createMockServer();

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

### Fixture Generator

Генератор рандомизированных тестовых данных для предотвращения утечки реальной информации:

```typescript
import { generateIssueFixture } from '@integration/helpers/fixture-generator.js';

const issue = generateIssueFixture({
  issueKey: 'QUEUE-1',
  summary: 'Кастомное саммари', // опционально
  statusKey: 'open',            // опционально
  typeKey: 'bug',               // опционально
  priorityKey: 'critical',      // опционально
  includeResolution: true,      // опционально
});
```

**Генерируемые данные:**
- ✅ Уникальные ID, UID, даты для каждого вызова
- ✅ Случайные пользователи, очереди, статусы
- ✅ Реалистичные структуры согласно API Яндекс.Трекер v3
- ✅ Нет захардкоженных реальных данных

**Доступные генераторы:**
- `generateIssueFixture(options)` — задача
- `generateError404Fixture()` — ошибка 404
- `generateError401Fixture()` — ошибка 401
- `generateError403Fixture()` — ошибка 403

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
  expect(response.issues).toHaveLength(1);
  expect(response.issues[0].issueKey).toBe(issueKey);

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
# Все тесты
npm test

# Только unit тесты
npm run test:unit

# Только интеграционные тесты
npm run test:integration

# С покрытием
npm run test:coverage

# Полная валидация (lint + typecheck + test + depcruise + build)
npm run validate
```

## 📊 Coverage

Требования к покрытию unit-тестами (настроено в `vitest.config.ts`):

- Branches: ≥80%
- Functions: ≥80%
- Lines: ≥80%
- Statements: ≥80%

**Важно:** Интеграционные тесты НЕ учитываются в покрытии (`coverage.all: false`).

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

## 📚 Дополнительные материалы

- **Документация Vitest:** https://vitest.dev/
- **nock (HTTP mocking):** https://github.com/nock/nock
- **InversifyJS (DI):** https://inversify.io/
- **API Яндекс.Трекер v3:** `yandex_tracker_client/` (Python SDK)
