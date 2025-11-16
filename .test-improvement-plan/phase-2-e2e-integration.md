# Фаза 2: E2E и Integration тесты (КООРДИНАЦИЯ)

**Зависимости:** Фаза 0 + Фаза 1 (все ветки смержены)
**Estimate:** 2-3 дня (каждая ветка независимо)
**Приоритет:** 🔴 КРИТИЧНО
**Параллельность:** 2 ветки с координацией по MockServer

---

## 🎯 Цель фазы

Добавить E2E и Integration тесты для полного покрытия workflows:
- **Ветка D:** E2E workflows (lifecycle, search, tracking)
- **Ветка E:** Integration для mutation tools

**⚠️ ВАЖНО:** Координация по `tests/integration/helpers/mock-server.ts`

---

## 🚨 Проблема: MockServer конфликты

Обе ветки добавляют методы в один файл:
```
tests/integration/helpers/
└── mock-server.ts  (конфликты здесь!)
```

### Решение: Naming convention

**Ветка D (E2E):** Префикс `e2e_`
**Ветка E (Integration):** БЕЗ префикса

Пример:
```typescript
// Ветка D
mockServer.e2e_createIssueSuccess();
mockServer.e2e_updateIssueSuccess(key);

// Ветка E
mockServer.mockCreateIssueSuccess();
mockServer.mockUpdateIssueSuccess(key);
```

---

## 🔀 Ветка D: E2E workflows

**Ветка:** `claude/test-phase-2d-e2e-<session-id>`
**Estimate:** 2-3 дня
**Owner:** Исполнитель D
**Конфликты:** MockServer (см. координацию)

### Цель
Создать E2E тесты для полных user workflows.

### Задачи
- [x] Дополнить E2E helpers из Фазы 0
- [x] E2E для issue lifecycle
- [x] E2E для issue search
- [x] E2E для issue tracking
- [x] Документация E2E подхода

### Детальный план
См. [02-critical-e2e.md](./02-critical-e2e.md):
- **Шаг 1:** ПРОПУСТИТЬ (уже сделан в Фазе 0)
- **Шаг 2:** Дополнить helpers (workflow-client.ts)
- **Шаги 3-6:** Выполнить полностью

### Критерии завершения
- [x] 3+ E2E файла созданы
- [x] WorkflowClient расширен (методы из Фазы 0 + новые)
- [x] Все E2E тесты проходят
- [x] E2E README обновлен

### Важные файлы
```
tests/e2e/
├── workflows/
│   ├── issue-lifecycle.test.ts  (новый)
│   ├── issue-search.test.ts     (новый)
│   └── issue-tracking.test.ts   (новый)
├── helpers/
│   ├── workflow-client.ts       (расширение Фазы 0)
│   └── assertion-helpers.ts     (расширение Фазы 0)
└── README.md                     (обновить)

tests/integration/helpers/
└── mock-server.ts  (⚠️ КООРДИНАЦИЯ)
```

### MockServer изменения (Ветка D)

**⚠️ Префикс `e2e_` для ВСЕХ новых методов:**

```typescript
// tests/integration/helpers/mock-server.ts

export class MockServer {
  // ... существующие методы ...

  /**
   * E2E: Mock успешного создания задачи
   */
  e2e_createIssueSuccess(issueData?: Partial<unknown>): void {
    const issue = generateIssue({ overrides: issueData });
    this.nockScope.post('/v3/issues').reply(201, issue);
  }

  /**
   * E2E: Mock успешного обновления задачи
   */
  e2e_updateIssueSuccess(issueKey: string, updates?: Partial<unknown>): void {
    const issue = generateIssue({
      overrides: { key: issueKey, ...updates }
    });
    this.nockScope.patch(`/v3/issues/${issueKey}`).reply(200, issue);
  }

  /**
   * E2E: Mock успешного перехода
   */
  e2e_transitionIssueSuccess(issueKey: string, transition: string): void {
    const issue = generateIssue({ overrides: { key: issueKey } });
    this.nockScope
      .post(`/v3/issues/${issueKey}/transitions/${transition}/_execute`)
      .reply(200, issue);
  }

  /**
   * E2E: Mock успешного получения changelog
   */
  e2e_getChangelogSuccess(issueKey: string): void {
    const changelog = [
      {
        updatedAt: '2024-01-01T00:00:00.000Z',
        updatedBy: { login: 'test-user' },
        fields: [{ field: { key: 'summary' } }],
      },
    ];
    this.nockScope
      .get(`/v3/issues/${issueKey}/changelog`)
      .reply(200, changelog);
  }

  /**
   * E2E: Mock успешного получения transitions
   */
  e2e_getTransitionsSuccess(
    issueKey: string,
    transitions: Array<{ id: string; to: { key: string } }>
  ): void {
    this.nockScope
      .get(`/v3/issues/${issueKey}/transitions`)
      .reply(200, transitions);
  }
}
```

### WorkflowClient расширение

```typescript
// tests/e2e/helpers/workflow-client.ts
// Добавить методы к базовой версии из Фазы 0

export class WorkflowClient {
  // ... методы из Фазы 0 (createIssue, getIssue) ...

  /**
   * Обновить задачу
   */
  async updateIssue(
    issueKey: string,
    updates: Record<string, unknown>
  ): Promise<void> {
    const result = await this.client.callTool(
      'fractalizer_mcp_yandex_tracker_update_issue',
      { issueKey, ...updates }
    );

    if (result.isError) {
      throw new Error(`Failed to update issue: ${result.content[0]?.text}`);
    }
  }

  /**
   * Перевести задачу в новый статус
   */
  async transitionIssue(
    issueKey: string,
    transition: string
  ): Promise<void> {
    const result = await this.client.callTool(
      'fractalizer_mcp_yandex_tracker_transition_issue',
      { issueKey, transition }
    );

    if (result.isError) {
      throw new Error(`Failed to transition issue: ${result.content[0]?.text}`);
    }
  }

  /**
   * Найти задачи по query
   */
  async findIssues(query: string): Promise<unknown[]> {
    const result = await this.client.callTool(
      'fractalizer_mcp_yandex_tracker_find_issues',
      { query }
    );

    if (result.isError) {
      throw new Error(`Failed to find issues: ${result.content[0]?.text}`);
    }

    const response = JSON.parse(result.content[0]!.text);
    return response.data.results;
  }
}
```

### Пример E2E теста

```typescript
// tests/e2e/workflows/issue-lifecycle.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
import { WorkflowClient } from '../helpers/workflow-client.js';
import { assertIssueStructure } from '../helpers/assertion-helpers.js';

describe('Issue Lifecycle E2E', () => {
  let client: TestMCPClient;
  let mockServer: MockServer;
  let workflow: WorkflowClient;

  beforeEach(async () => {
    client = await createTestClient({ logLevel: 'silent' });
    mockServer = createMockServer();
    workflow = new WorkflowClient(client);
  });

  afterEach(() => {
    mockServer.cleanup();
  });

  it('должен выполнить полный цикл: создать → обновить → перевести', async () => {
    // Arrange
    const issueData = {
      queue: 'TEST',
      summary: 'E2E Test Issue',
    };

    // Act 1: Создание
    mockServer.e2e_createIssueSuccess();  // ✅ Префикс e2e_
    const issueKey = await workflow.createIssue(issueData);

    // Act 2: Обновление
    mockServer.e2e_updateIssueSuccess(issueKey);  // ✅ Префикс e2e_
    await workflow.updateIssue(issueKey, { summary: 'Updated' });

    // Act 3: Переход
    mockServer.e2e_transitionIssueSuccess(issueKey, 'inProgress');  // ✅ Префикс e2e_
    await workflow.transitionIssue(issueKey, 'inProgress');

    // Act 4: Получение финального состояния
    mockServer.e2e_getIssueSuccess(issueKey);  // ✅ Префикс e2e_
    const finalIssue = await workflow.getIssue(issueKey);

    // Assert
    assertIssueStructure(finalIssue);
  });
});
```

### PR Checklist (Ветка D)
- [ ] E2E тесты созданы (3+ файла)
- [ ] WorkflowClient расширен
- [ ] MockServer методы с префиксом `e2e_`
- [ ] E2E README обновлен
- [ ] `npm run test:e2e` проходит

---

## 🔀 Ветка E: Integration для mutation tools

**Ветка:** `claude/test-phase-2e-integration-<session-id>`
**Estimate:** 2 дня
**Owner:** Исполнитель E
**Конфликты:** MockServer (см. координацию)

### Цель
Создать integration тесты для mutation tools (create, update, transition).

### Задачи
- [x] Integration для create-issue
- [x] Integration для update-issue
- [x] Integration для transition-issue
- [x] Integration для changelog/transitions

### Детальный план
См. [04-important-integration.md](./04-important-integration.md) - выполнить ВСЕ шаги.

### Критерии завершения
- [x] 5 integration файлов созданы
- [x] Все mutation tools покрыты
- [x] MockServer обновлен
- [x] `npm run test:integration` проходит

### Важные файлы
```
tests/integration/mcp/tools/api/issues/
├── create/
│   └── create-issue.tool.integration.test.ts  (новый)
├── update/
│   └── update-issue.tool.integration.test.ts  (новый)
├── transition/
│   └── transition-issue.tool.integration.test.ts  (новый)
├── changelog/
│   └── get-issue-changelog.tool.integration.test.ts  (новый)
└── transitions/
    └── get-issue-transitions.tool.integration.test.ts  (новый)

tests/integration/helpers/
└── mock-server.ts  (⚠️ КООРДИНАЦИЯ)
```

### MockServer изменения (Ветка E)

**⚠️ БЕЗ префикса (или префикс `integration_`):**

```typescript
// tests/integration/helpers/mock-server.ts

export class MockServer {
  // ... существующие методы ...

  /**
   * Mock успешного создания задачи
   */
  mockCreateIssueSuccess(issueData?: Partial<unknown>): void {
    const issue = generateIssue({ overrides: issueData });
    this.nockScope.post('/v3/issues').reply(201, issue);
  }

  /**
   * Mock ошибки 403 при создании
   */
  mockCreateIssue403(): void {
    this.nockScope.post('/v3/issues').reply(403, {
      statusCode: 403,
      errorMessages: ['Access denied'],
    });
  }

  /**
   * Mock успешного обновления задачи
   */
  mockUpdateIssueSuccess(issueKey: string, updates?: Partial<unknown>): void {
    const issue = generateIssue({
      overrides: { key: issueKey, ...updates }
    });
    this.nockScope.patch(`/v3/issues/${issueKey}`).reply(200, issue);
  }

  /**
   * Mock ошибки 404 при обновлении
   */
  mockUpdateIssue404(issueKey: string): void {
    this.nockScope.patch(`/v3/issues/${issueKey}`).reply(404, {
      statusCode: 404,
      errorMessages: ['Issue not found'],
    });
  }

  /**
   * Mock успешного перехода
   */
  mockTransitionIssueSuccess(issueKey: string, transition: string): void {
    const issue = generateIssue({ overrides: { key: issueKey } });
    this.nockScope
      .post(`/v3/issues/${issueKey}/transitions/${transition}/_execute`)
      .reply(200, issue);
  }

  // ... остальные методы для changelog, transitions ...
}
```

### Пример Integration теста

```typescript
// tests/integration/mcp/tools/api/issues/create/create-issue.tool.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';

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

  it('должен создать задачу с минимальными полями', async () => {
    // Arrange
    mockServer.mockCreateIssueSuccess();  // ✅ БЕЗ префикса e2e_

    // Act
    const result = await client.callTool(
      'fractalizer_mcp_yandex_tracker_create_issue',
      {
        queue: 'TEST',
        summary: 'Test issue',
      }
    );

    // Assert
    expect(result.isError).toBeUndefined();
    mockServer.assertAllRequestsDone();
  });

  it('должен обработать ошибку 403', async () => {
    // Arrange
    mockServer.mockCreateIssue403();  // ✅ БЕЗ префикса e2e_

    // Act
    const result = await client.callTool(
      'fractalizer_mcp_yandex_tracker_create_issue',
      {
        queue: 'TEST',
        summary: 'Test',
      }
    );

    // Assert
    expect(result.isError).toBe(true);
  });
});
```

### PR Checklist (Ветка E)
- [ ] Integration тесты созданы (5 файлов)
- [ ] MockServer методы БЕЗ префикса `e2e_`
- [ ] Покрыты error cases (403, 404, 400)
- [ ] `npm run test:integration` проходит

---

## 📋 Координация между ветками

### Стратегия 1: Naming convention (РЕКОМЕНДУЕТСЯ)

**Договориться заранее:**
- Ветка D: префикс `e2e_`
- Ветка E: БЕЗ префикса

**Преимущества:**
- Можно мержить в любом порядке
- Нет конфликтов в git
- Понятно какие методы для чего

**Мерж:**
```
Фаза 1 → main
    ↓
Ветка D → main  ┐ Любой порядок
Ветка E → main  ┘
```

### Стратегия 2: Sequential merge

**Если не договорились заранее:**

1. Ветка D мержится ПЕРВОЙ
2. Ветка E делает rebase на main после мержа D
3. Ветка E адаптирует имена методов (если конфликты)

**Мерж:**
```
Фаза 1 → main
    ↓
Ветка D → main
    ↓
Ветка E rebase на main
    ↓
Ветка E → main
```

### Проверка конфликтов

**Перед PR обеих веток:**
```bash
# В Ветке D
git fetch origin main
git merge origin/main
# Решить конфликты если есть

# В Ветке E
git fetch origin main
git merge origin/main
# Решить конфликты если есть
```

---

## ✅ Критерии завершения Фазы 2

### Must Have
- [x] Обе ветки смержены в main
- [x] 3+ E2E файла (Ветка D)
- [x] 5 Integration файлов (Ветка E)
- [x] MockServer содержит методы обеих веток
- [x] Все тесты проходят

### Should Have
- [x] WorkflowClient полностью реализован
- [x] E2E README обновлен
- [x] Error cases покрыты в integration

### Nice to Have
- [ ] Visual diagram workflows
- [ ] Performance метрики

---

## 📊 Ожидаемые метрики после Фазы 2

| Метрика | До Фазы 2 | После Фазы 2 |
|---------|-----------|--------------|
| E2E файлов | 1 | 4+ |
| Integration файлов | 6 | 11+ |
| Overall coverage | 65-70% | 75-78% |

---

## 🚨 Важные замечания

### ⚠️ Используй паттерны Фазы 0
Обе ветки ДОЛЖНЫ использовать mock factories:
```typescript
import { createMockLogger } from '@tests/helpers/mock-factories.js';
```

### ⚠️ Префиксы в MockServer
- **Ветка D:** Все новые методы с префиксом `e2e_`
- **Ветка E:** Все новые методы БЕЗ префикса (или `integration_`)

### ⚠️ Не меняй thresholds
Thresholds обновляются ТОЛЬКО в Фазе 3-F1.

---

## 📝 Общий шаблон для PR

```markdown
# Фаза 2[D/E]: [E2E workflows / Integration mutation tools]

## Изменения
- ✅ [Список файлов/тестов]
- ✅ MockServer: добавлены методы с [e2e_/без] префиксом

## Метрики
| Метрика | До | После |
|---------|-----|-------|
| [E2E/Integration] файлов | ... | ... |
| Coverage | ... | ... |

## Координация
- **MockServer префикс:** [e2e_ / БЕЗ префикса]
- **Конфликты:** [Нет / Решены через rebase]

## Проверка
- [x] `npm run test:[e2e/integration]` проходит
- [x] Используются mock factories из Фазы 0
- [x] MockServer naming convention соблюдён

## Связь
- **Зависимости:** Фаза 0 + Фаза 1 (смержены)
- **Следующая фаза:** Фаза 3 (после мержа обеих веток)

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

**Следующая фаза:** [phase-3-finalization.md](./phase-3-finalization.md) (после мержа обеих веток Фазы 2)
