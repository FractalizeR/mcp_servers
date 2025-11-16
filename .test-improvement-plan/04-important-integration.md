# Этап 4: Integration тесты для mutation tools

**Приоритет:** 🟡 ВАЖНО
**Estimate:** 2 дня
**Impact:** MEDIUM
**Effort:** MEDIUM

---

## 📊 Текущее состояние

**Integration тесты есть для:**
- ✅ get-issues.tool
- ✅ find-issues.tool
- ✅ search-tools.tool

**Integration тестов НЕТ для:**
- ❌ create-issue.tool
- ❌ update-issue.tool
- ❌ transition-issue.tool
- ❌ get-issue-changelog.tool
- ❌ get-issue-transitions.tool

**Риск:** Mutation tools могут содержать integration bugs, не покрытые unit тестами.

---

## 🎯 Цели

1. Создать integration тесты для 3 основных mutation tools
2. Покрыть полный flow через DI контейнер
3. Протестировать реальные HTTP запросы (через nock)
4. Обеспечить confidence в корректности интеграции слоев

---

## 📋 План действий

### Шаг 1: Integration тесты для create-issue (0.5 дня)

**Файл:** `tests/integration/mcp/tools/api/issues/create/create-issue.tool.integration.test.ts`

**Структура:**
```
tests/integration/mcp/tools/api/issues/create/
└── create-issue.tool.integration.test.ts
```

**Сценарии для тестирования:**
1. ✅ Успешное создание задачи с минимальными полями
2. ✅ Создание с опциональными полями
3. ✅ Валидация обязательных полей
4. ✅ Обработка ошибок HTTP (403, 400)
5. ✅ Проверка формата ответа

**Пример теста:**

```typescript
// tests/integration/mcp/tools/api/issues/create/create-issue.tool.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
import { generateIssue } from '@integration/helpers/template-based-generator.js';
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';
import type { MockServer } from '@integration/helpers/mock-server.js';

describe('create-issue integration tests', () => {
  let client: TestMCPClient;
  let mockServer: MockServer;

  beforeEach(async () => {
    client = await createTestClient({ logLevel: 'silent' });
    mockServer = createMockServer();
  });

  afterEach(() => {
    mockServer.cleanup();
  });

  describe('Успешное создание задачи', () => {
    it('должен создать задачу с минимальными полями', async () => {
      // Arrange
      const createdIssue = generateIssue({
        overrides: {
          key: 'TEST-123',
          summary: 'Тестовая задача',
          queue: { key: 'TEST' },
        },
      });

      mockServer.mockPost('/v3/issues', {
        status: 201,
        body: createdIssue,
      });

      // Act
      const result = await client.callTool(
        'fractalizer_mcp_yandex_tracker_create_issue',
        {
          queue: 'TEST',
          summary: 'Тестовая задача',
        }
      );

      // Assert
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);

      const response = JSON.parse(result.content[0]!.text);
      expect(response).toHaveProperty('key');
      expect(response).toHaveProperty('summary');
      expect(response.summary).toBe('Тестовая задача');

      mockServer.assertAllRequestsDone();
    });

    it('должен создать задачу со всеми опциональными полями', async () => {
      // Arrange
      const createdIssue = generateIssue({
        overrides: {
          key: 'TEST-124',
          summary: 'Полная задача',
          description: 'Описание задачи',
          priority: { key: 'high' },
          type: { key: 'bug' },
        },
      });

      mockServer.mockPost('/v3/issues', {
        status: 201,
        body: createdIssue,
      });

      // Act
      const result = await client.callTool(
        'fractalizer_mcp_yandex_tracker_create_issue',
        {
          queue: 'TEST',
          summary: 'Полная задача',
          description: 'Описание задачи',
          priority: 'high',
          type: 'bug',
          assignee: 'user@example.com',
          tags: ['integration', 'test'],
        }
      );

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0]!.text);
      expect(response.summary).toBe('Полная задача');

      mockServer.assertAllRequestsDone();
    });
  });

  describe('Валидация параметров', () => {
    it('должен вернуть ошибку если отсутствует queue', async () => {
      // Act
      const result = await client.callTool(
        'fractalizer_mcp_yandex_tracker_create_issue',
        {
          summary: 'Тест',
          // queue отсутствует
        }
      );

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('queue');
    });

    it('должен вернуть ошибку если отсутствует summary', async () => {
      // Act
      const result = await client.callTool(
        'fractalizer_mcp_yandex_tracker_create_issue',
        {
          queue: 'TEST',
          // summary отсутствует
        }
      );

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('summary');
    });
  });

  describe('Обработка ошибок HTTP', () => {
    it('должен обработать ошибку 403 (доступ запрещён)', async () => {
      // Arrange
      mockServer.mockPost('/v3/issues', {
        status: 403,
        body: {
          statusCode: 403,
          errorMessages: ['У вас нет прав на создание задач в очереди TEST'],
        },
      });

      // Act
      const result = await client.callTool(
        'fractalizer_mcp_yandex_tracker_create_issue',
        {
          queue: 'TEST',
          summary: 'Тест',
        }
      );

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('403');

      mockServer.assertAllRequestsDone();
    });

    it('должен обработать ошибку 400 (некорректные данные)', async () => {
      // Arrange
      mockServer.mockPost('/v3/issues', {
        status: 400,
        body: {
          statusCode: 400,
          errorMessages: ['Некорректный формат поля priority'],
        },
      });

      // Act
      const result = await client.callTool(
        'fractalizer_mcp_yandex_tracker_create_issue',
        {
          queue: 'TEST',
          summary: 'Тест',
          priority: 'invalid_priority',
        }
      );

      // Assert
      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('400');

      mockServer.assertAllRequestsDone();
    });
  });

  describe('Фильтрация полей', () => {
    it('должен вернуть только запрошенные поля', async () => {
      // Arrange
      const createdIssue = generateIssue({
        overrides: { key: 'TEST-125', summary: 'Тест' },
      });

      mockServer.mockPost('/v3/issues', {
        status: 201,
        body: createdIssue,
      });

      // Act
      const result = await client.callTool(
        'fractalizer_mcp_yandex_tracker_create_issue',
        {
          queue: 'TEST',
          summary: 'Тест',
          fields: ['key', 'summary'],
        }
      );

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0]!.text);

      expect(response).toHaveProperty('key');
      expect(response).toHaveProperty('summary');
      expect(response).not.toHaveProperty('description');
      expect(response).not.toHaveProperty('status');

      mockServer.assertAllRequestsDone();
    });
  });
});
```

**Обновить MockServer:**
```typescript
// tests/integration/helpers/mock-server.ts

/**
 * Mock успешного создания задачи
 */
mockCreateIssueSuccess(issueData?: Partial<unknown>): void {
  const issue = generateIssue({
    overrides: issueData,
  });

  this.nockScope
    .post('/v3/issues')
    .reply(201, issue);
}

/**
 * Mock ошибки 403 при создании
 */
mockCreateIssue403(): void {
  this.nockScope
    .post('/v3/issues')
    .reply(403, {
      statusCode: 403,
      errorMessages: ['Access denied'],
    });
}

/**
 * Mock ошибки 400 при создании
 */
mockCreateIssue400(): void {
  this.nockScope
    .post('/v3/issues')
    .reply(400, {
      statusCode: 400,
      errorMessages: ['Invalid request'],
    });
}
```

**Чек-лист:**
- [ ] Создать create-issue.tool.integration.test.ts
- [ ] Тест: создание с минимальными полями
- [ ] Тест: создание со всеми полями
- [ ] Тест: валидация queue
- [ ] Тест: валидация summary
- [ ] Тест: ошибка 403
- [ ] Тест: ошибка 400
- [ ] Тест: фильтрация полей
- [ ] Обновить MockServer helpers
- [ ] Запустить `npm run test:integration`

---

### Шаг 2: Integration тесты для update-issue (0.5 дня)

**Файл:** `tests/integration/mcp/tools/api/issues/update/update-issue.tool.integration.test.ts`

**Сценарии:**
1. ✅ Обновление одного поля
2. ✅ Обновление нескольких полей
3. ✅ Валидация issueKey
4. ✅ Обработка ошибок (404, 403, 400)
5. ✅ Фильтрация полей в ответе

**Пример теста:**

```typescript
describe('update-issue integration tests', () => {
  describe('Успешное обновление', () => {
    it('должен обновить одно поле задачи', async () => {
      // Arrange
      const issueKey = 'TEST-123';
      const updatedIssue = generateIssue({
        overrides: {
          key: issueKey,
          summary: 'Обновлённый summary',
        },
      });

      mockServer.mockPatch(`/v3/issues/${issueKey}`, {
        status: 200,
        body: updatedIssue,
      });

      // Act
      const result = await client.callTool(
        'fractalizer_mcp_yandex_tracker_update_issue',
        {
          issueKey,
          summary: 'Обновлённый summary',
        }
      );

      // Assert
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0]!.text);
      expect(response.summary).toBe('Обновлённый summary');

      mockServer.assertAllRequestsDone();
    });

    it('должен обновить несколько полей одновременно', async () => {
      // Arrange
      const issueKey = 'TEST-124';
      const updatedIssue = generateIssue({
        overrides: {
          key: issueKey,
          summary: 'Новый summary',
          description: 'Новое описание',
          priority: { key: 'critical' },
        },
      });

      mockServer.mockPatch(`/v3/issues/${issueKey}`, {
        status: 200,
        body: updatedIssue,
      });

      // Act
      const result = await client.callTool(
        'fractalizer_mcp_yandex_tracker_update_issue',
        {
          issueKey,
          summary: 'Новый summary',
          description: 'Новое описание',
          priority: 'critical',
        }
      );

      // Assert
      expect(result.isError).toBeUndefined();
      mockServer.assertAllRequestsDone();
    });
  });

  describe('Валидация параметров', () => {
    it('должен вернуть ошибку если отсутствует issueKey', async () => {
      const result = await client.callTool(
        'fractalizer_mcp_yandex_tracker_update_issue',
        {
          summary: 'Тест',
        }
      );

      expect(result.isError).toBe(true);
    });

    it('должен вернуть ошибку если нет полей для обновления', async () => {
      const result = await client.callTool(
        'fractalizer_mcp_yandex_tracker_update_issue',
        {
          issueKey: 'TEST-123',
          // Нет полей для обновления
        }
      );

      expect(result.isError).toBe(true);
    });
  });

  describe('Обработка ошибок HTTP', () => {
    it('должен обработать ошибку 404 (задача не найдена)', async () => {
      mockServer.mockPatch('/v3/issues/NONEXISTENT-1', {
        status: 404,
        body: { statusCode: 404, errorMessages: ['Issue not found'] },
      });

      const result = await client.callTool(
        'fractalizer_mcp_yandex_tracker_update_issue',
        {
          issueKey: 'NONEXISTENT-1',
          summary: 'Тест',
        }
      );

      expect(result.isError).toBe(true);
      mockServer.assertAllRequestsDone();
    });

    it('должен обработать ошибку 403 (доступ запрещён)', async () => {
      mockServer.mockPatch('/v3/issues/TEST-123', {
        status: 403,
        body: { statusCode: 403, errorMessages: ['Access denied'] },
      });

      const result = await client.callTool(
        'fractalizer_mcp_yandex_tracker_update_issue',
        {
          issueKey: 'TEST-123',
          summary: 'Тест',
        }
      );

      expect(result.isError).toBe(true);
      mockServer.assertAllRequestsDone();
    });
  });
});
```

**Обновить MockServer:**
```typescript
/**
 * Mock успешного обновления задачи
 */
mockUpdateIssueSuccess(issueKey: string, updates?: Partial<unknown>): void {
  const issue = generateIssue({
    overrides: { key: issueKey, ...updates },
  });

  this.nockScope
    .patch(`/v3/issues/${issueKey}`)
    .reply(200, issue);
}

mockUpdateIssue404(issueKey: string): void { ... }
mockUpdateIssue403(issueKey: string): void { ... }
```

**Чек-лист:**
- [ ] Создать update-issue.tool.integration.test.ts
- [ ] Тесты для всех сценариев
- [ ] Обновить MockServer
- [ ] Запустить тесты

---

### Шаг 3: Integration тесты для transition-issue (0.5 дня)

**Файл:** `tests/integration/mcp/tools/api/issues/transition/transition-issue.tool.integration.test.ts`

**Сценарии:**
1. ✅ Успешный переход
2. ✅ Переход с комментарием
3. ✅ Валидация параметров
4. ✅ Ошибки (404, 400, 403)

**Пример сокращенно:**
```typescript
describe('transition-issue integration tests', () => {
  it('должен выполнить переход в новый статус', async () => { ... });
  it('должен выполнить переход с комментарием', async () => { ... });
  it('должен обработать ошибку 400 (недопустимый переход)', async () => { ... });
});
```

**Чек-лист:**
- [ ] Создать transition-issue.tool.integration.test.ts
- [ ] Тесты для всех сценариев
- [ ] Обновить MockServer
- [ ] Запустить тесты

---

### Шаг 4: Integration тесты для changelog и transitions (0.5 дня)

**Файлы:**
- `tests/integration/mcp/tools/api/issues/changelog/get-issue-changelog.tool.integration.test.ts`
- `tests/integration/mcp/tools/api/issues/transitions/get-issue-transitions.tool.integration.test.ts`

**Сценарии changelog:**
1. ✅ Получение changelog существующей задачи
2. ✅ Пустой changelog
3. ✅ Фильтрация полей
4. ✅ Ошибки (404, 403)

**Сценарии transitions:**
1. ✅ Получение доступных переходов
2. ✅ Пустой список переходов
3. ✅ Ошибки (404, 403)

**Чек-лист:**
- [ ] Создать оба файла
- [ ] Тесты для всех сценариев
- [ ] Обновить MockServer
- [ ] Запустить тесты

---

## ✅ Критерии завершения

### Must Have
- [x] Integration тесты для create-issue
- [x] Integration тесты для update-issue
- [x] Integration тесты для transition-issue
- [x] Все тесты проходят

### Should Have
- [x] Integration тесты для changelog
- [x] Integration тесты для transitions
- [x] MockServer helpers обновлены

### Nice to Have
- [ ] Документация integration паттернов обновлена

---

## 📝 Шаблон для PR

```markdown
# Integration тесты для mutation tools

## Изменения
- ✅ Добавлены integration тесты для create-issue
- ✅ Добавлены integration тесты для update-issue
- ✅ Добавлены integration тесты для transition-issue
- ✅ Обновлены MockServer helpers

## Метрики
| Метрика | До | После |
|---------|-----|-------|
| Integration файлов | 6 | 9 |
| Mutation tools coverage | 33% | 100% |

## Проверка
- [x] `npm run test:integration` проходит
- [x] Все mutation tools покрыты

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

**Следующий этап:** [05-important-refactoring.md](./05-important-refactoring.md)
