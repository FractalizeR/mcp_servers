# Этап 2: E2E тесты для основных API tools

**Приоритет:** 🔴 КРИТИЧНО
**Estimate:** 2-3 дня
**Impact:** HIGH
**Effort:** MEDIUM

---

## 📊 Текущее состояние

**E2E тесты:** 1 файл (search-tools.tool.test.ts)
**Целевое состояние:** 5-6 файлов

**Отсутствуют E2E тесты для:**
- ❌ get-issues.tool
- ❌ find-issues.tool
- ❌ create-issue.tool
- ❌ update-issue.tool
- ❌ transition-issue.tool
- ❌ get-issue-changelog.tool
- ❌ get-issue-transitions.tool

---

## 🎯 Цели

1. Создать E2E тесты для 5 основных API tools
2. Покрыть полный user workflow (get → update → transition)
3. Протестировать интеграцию всех слоев системы
4. Обеспечить confidence в production-like сценариях

---

## 📋 План действий

### Шаг 1: Понимание E2E vs Integration (30 мин)

**Разница между Integration и E2E тестами в проекте:**

| Аспект | Integration | E2E |
|--------|-------------|-----|
| **Scope** | Один tool + его зависимости | Полный workflow через несколько tools |
| **HTTP Mock** | Nock (детальные моки для каждого теста) | Nock (минимальные моки, фокус на flow) |
| **DI Container** | Реальный | Реальный |
| **Данные** | Template-based фикстуры | Template-based фикстуры |
| **Цель** | Проверка корректности отдельного tool | Проверка user scenarios |

**Пример различия:**

```typescript
// Integration test (tests/integration/mcp/tools/api/issues/get/)
describe('get-issues integration', () => {
  it('должен получить задачу по ключу', async () => {
    // Тестирует ТОЛЬКО get-issues tool
    mockServer.mockGetIssueSuccess('QUEUE-1');
    const result = await client.callTool('...get_issues', {
      issueKeys: ['QUEUE-1']
    });
    expect(result.isError).toBeUndefined();
  });
});

// E2E test (tests/e2e/workflows/)
describe('Issue management workflow', () => {
  it('должен выполнить полный цикл: создать → обновить → перевести', async () => {
    // Тестирует WORKFLOW через несколько tools

    // 1. Создать задачу
    mockServer.mockCreateIssueSuccess();
    const created = await client.callTool('...create_issue', { ... });
    const issueKey = extractIssueKey(created);

    // 2. Обновить задачу
    mockServer.mockUpdateIssueSuccess(issueKey);
    await client.callTool('...update_issue', { ... });

    // 3. Перевести задачу
    mockServer.mockTransitionIssueSuccess(issueKey);
    await client.callTool('...transition_issue', { ... });

    // 4. Проверить финальное состояние
    mockServer.mockGetIssueSuccess(issueKey);
    const final = await client.callTool('...get_issues', {
      issueKeys: [issueKey]
    });

    expect(final.status).toBe('completed');
  });
});
```

---

### Шаг 2: Подготовка инфраструктуры (1-2 часа)

**Задачи:**
1. Создать структуру `tests/e2e/`
2. Создать workflow helpers
3. Обновить npm scripts

**Структура:**
```
tests/e2e/
├── workflows/                    # Основные E2E тесты
│   ├── issue-lifecycle.test.ts  # Создание → Обновление → Закрытие
│   ├── issue-search.test.ts     # Поиск и получение задач
│   └── issue-tracking.test.ts   # Changelog + Transitions
│
├── helpers/
│   ├── workflow-client.ts       # Wrapper для multi-step workflows
│   └── assertion-helpers.ts     # Переиспользуемые assertions
│
└── README.md                     # Документация E2E подхода
```

**Создать workflow-client.ts:**
```typescript
// tests/e2e/helpers/workflow-client.ts
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';

/**
 * Helper для E2E workflows с автоматическим извлечением данных
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
    return response.key; // Извлечь ключ из ответа
  }

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

**Создать assertion-helpers.ts:**
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
  expect((issue as any).status).toHaveProperty('key');
  expect((issue as any).status.key).toBe(expectedStatus);
}

/**
 * Проверить что changelog содержит изменения
 */
export function assertChangelogHasChanges(changelog: unknown[]): void {
  expect(Array.isArray(changelog)).toBe(true);
  expect(changelog.length).toBeGreaterThan(0);

  const firstChange = changelog[0];
  expect(firstChange).toHaveProperty('updatedAt');
  expect(firstChange).toHaveProperty('updatedBy');
  expect(firstChange).toHaveProperty('fields');
}
```

**Обновить package.json:**
```json
{
  "scripts": {
    "test:e2e": "vitest run tests/e2e",
    "test:e2e:watch": "vitest tests/e2e"
  }
}
```

**Чек-лист:**
- [ ] Создать tests/e2e/workflows/
- [ ] Создать tests/e2e/helpers/
- [ ] Создать workflow-client.ts
- [ ] Создать assertion-helpers.ts
- [ ] Обновить package.json scripts
- [ ] Создать tests/e2e/README.md

---

### Шаг 3: E2E для Issue Lifecycle (1 день)

**Файл:** `tests/e2e/workflows/issue-lifecycle.test.ts`

**Сценарии:**
1. Полный lifecycle: создать → обновить → перевести
2. Создание с валидацией полей
3. Обновление нескольких полей
4. Переход через несколько статусов

**Пример теста:**

```typescript
// tests/e2e/workflows/issue-lifecycle.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestClient } from '@integration/helpers/mcp-client.js';
import { createMockServer } from '@integration/helpers/mock-server.js';
import { WorkflowClient } from '../helpers/workflow-client.js';
import {
  assertIssueStructure,
  assertIssueStatus,
} from '../helpers/assertion-helpers.js';
import type { TestMCPClient } from '@integration/helpers/mcp-client.js';
import type { MockServer } from '@integration/helpers/mock-server.js';

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

  describe('Полный lifecycle: создать → обновить → перевести → получить', () => {
    it('должен выполнить полный цикл работы с задачей', async () => {
      // Arrange: подготовка данных
      const issueData = {
        queue: 'TEST',
        summary: 'E2E Test Issue',
        description: 'Created by E2E test',
      };

      // Act 1: Создание задачи
      mockServer.mockCreateIssueSuccess();
      const issueKey = await workflow.createIssue(issueData);

      // Assert 1: Задача создана
      expect(issueKey).toMatch(/^TEST-\d+$/);

      // Act 2: Обновление задачи
      mockServer.mockUpdateIssueSuccess(issueKey);
      await workflow.updateIssue(issueKey, {
        summary: 'Updated Summary',
        priority: 'high',
      });

      // Act 3: Переход в новый статус
      mockServer.mockTransitionIssueSuccess(issueKey, 'inProgress');
      await workflow.transitionIssue(issueKey, 'inProgress');

      // Act 4: Получение финального состояния
      mockServer.mockGetIssueSuccess(issueKey, {
        summary: 'Updated Summary',
        status: { key: 'inProgress' },
      });
      const finalIssue = await workflow.getIssue(issueKey);

      // Assert Final: Проверка финального состояния
      assertIssueStructure(finalIssue);
      assertIssueStatus(finalIssue, 'inProgress');
      expect((finalIssue as any).summary).toBe('Updated Summary');
    });

    it('должен обработать ошибки на разных этапах lifecycle', async () => {
      // Arrange
      mockServer.mockCreateIssueSuccess();
      const issueKey = await workflow.createIssue({
        queue: 'TEST',
        summary: 'Test',
      });

      // Act & Assert: Ошибка при обновлении
      mockServer.mockUpdateIssue403(issueKey);
      await expect(
        workflow.updateIssue(issueKey, { summary: 'New' })
      ).rejects.toThrow('Failed to update issue');

      // Act & Assert: Ошибка при переходе
      mockServer.mockTransitionIssue400(issueKey);
      await expect(
        workflow.transitionIssue(issueKey, 'invalidTransition')
      ).rejects.toThrow('Failed to transition issue');
    });
  });

  describe('Создание задачи с различными конфигурациями', () => {
    it('должен создать задачу с минимальными полями', async () => {
      mockServer.mockCreateIssueSuccess();

      const issueKey = await workflow.createIssue({
        queue: 'TEST',
        summary: 'Minimal Issue',
      });

      expect(issueKey).toMatch(/^TEST-\d+$/);
    });

    it('должен создать задачу со всеми опциональными полями', async () => {
      mockServer.mockCreateIssueSuccess();

      const result = await client.callTool(
        'fractalizer_mcp_yandex_tracker_create_issue',
        {
          queue: 'TEST',
          summary: 'Full Issue',
          description: 'Description',
          priority: 'high',
          type: 'bug',
          assignee: 'user@example.com',
          tags: ['e2e', 'test'],
        }
      );

      expect(result.isError).toBeUndefined();
    });
  });

  describe('Обновление задачи', () => {
    it('должен обновить одно поле', async () => {
      // Create
      mockServer.mockCreateIssueSuccess();
      const issueKey = await workflow.createIssue({
        queue: 'TEST',
        summary: 'Test',
      });

      // Update
      mockServer.mockUpdateIssueSuccess(issueKey);
      await workflow.updateIssue(issueKey, { summary: 'New Summary' });

      // Verify
      mockServer.mockGetIssueSuccess(issueKey, {
        summary: 'New Summary',
      });
      const issue = await workflow.getIssue(issueKey);
      expect((issue as any).summary).toBe('New Summary');
    });

    it('должен обновить несколько полей одновременно', async () => {
      mockServer.mockCreateIssueSuccess();
      const issueKey = await workflow.createIssue({
        queue: 'TEST',
        summary: 'Test',
      });

      mockServer.mockUpdateIssueSuccess(issueKey);
      await workflow.updateIssue(issueKey, {
        summary: 'New Summary',
        description: 'New Description',
        priority: 'high',
      });

      mockServer.mockGetIssueSuccess(issueKey, {
        summary: 'New Summary',
        description: 'New Description',
        priority: { key: 'high' },
      });
      const issue = await workflow.getIssue(issueKey);

      expect((issue as any).summary).toBe('New Summary');
      expect((issue as any).priority.key).toBe('high');
    });
  });

  describe('Переходы между статусами', () => {
    it('должен выполнить последовательность переходов', async () => {
      // Create issue
      mockServer.mockCreateIssueSuccess();
      const issueKey = await workflow.createIssue({
        queue: 'TEST',
        summary: 'Test',
      });

      // Transition: open → inProgress
      mockServer.mockTransitionIssueSuccess(issueKey, 'inProgress');
      await workflow.transitionIssue(issueKey, 'inProgress');

      // Transition: inProgress → resolved
      mockServer.mockTransitionIssueSuccess(issueKey, 'resolved');
      await workflow.transitionIssue(issueKey, 'resolved');

      // Transition: resolved → closed
      mockServer.mockTransitionIssueSuccess(issueKey, 'closed');
      await workflow.transitionIssue(issueKey, 'closed');

      // Verify final state
      mockServer.mockGetIssueSuccess(issueKey, {
        status: { key: 'closed' },
      });
      const issue = await workflow.getIssue(issueKey);
      assertIssueStatus(issue, 'closed');
    });
  });
});
```

**Чек-лист:**
- [ ] Создать issue-lifecycle.test.ts
- [ ] Тест: полный lifecycle
- [ ] Тест: создание с минимальными полями
- [ ] Тест: создание со всеми полями
- [ ] Тест: обновление одного поля
- [ ] Тест: обновление нескольких полей
- [ ] Тест: последовательность переходов
- [ ] Тест: error handling на каждом этапе
- [ ] Запустить `npm run test:e2e` — все зеленые

---

### Шаг 4: E2E для Issue Search (0.5 дня)

**Файл:** `tests/e2e/workflows/issue-search.test.ts`

**Сценарии:**
1. Поиск задач по query
2. Получение нескольких задач по ключам
3. Комбинация search + get

**Пример теста:**

```typescript
// tests/e2e/workflows/issue-search.test.ts
describe('Issue Search E2E', () => {
  describe('Workflow: поиск → получение деталей', () => {
    it('должен найти задачи и получить их детали', async () => {
      // Act 1: Найти задачи
      mockServer.mockFindIssuesSuccess(['TEST-1', 'TEST-2']);
      const foundIssues = await workflow.findIssues('queue: TEST');

      // Assert 1: Найдены задачи
      expect(foundIssues).toHaveLength(2);

      // Act 2: Получить детали найденных задач
      const issueKeys = foundIssues.map(i => (i as any).key);
      mockServer.mockGetIssuesSuccess(issueKeys);
      const details = await Promise.all(
        issueKeys.map(key => workflow.getIssue(key))
      );

      // Assert 2: Получены детали
      expect(details).toHaveLength(2);
      details.forEach(assertIssueStructure);
    });
  });

  describe('Batch получение задач', () => {
    it('должен получить несколько задач одновременно', async () => {
      const keys = ['TEST-1', 'TEST-2', 'TEST-3'];
      mockServer.mockGetIssuesSuccess(keys);

      const result = await client.callTool(
        'fractalizer_mcp_yandex_tracker_get_issues',
        { issueKeys: keys }
      );

      const response = JSON.parse(result.content[0]!.text);
      expect(response.data.total).toBe(3);
      expect(response.data.successful).toBe(3);
    });

    it('должен обработать mixed results (успех + ошибки)', async () => {
      mockServer.mockGetIssueSuccess('TEST-1');
      mockServer.mockGetIssue404('NONEXISTENT-1');
      mockServer.mockGetIssueSuccess('TEST-2');

      const result = await client.callTool(
        'fractalizer_mcp_yandex_tracker_get_issues',
        { issueKeys: ['TEST-1', 'NONEXISTENT-1', 'TEST-2'] }
      );

      const response = JSON.parse(result.content[0]!.text);
      expect(response.data.total).toBe(3);
      expect(response.data.successful).toBe(2);
      expect(response.data.failed).toBe(1);
    });
  });
});
```

**Чек-лист:**
- [ ] Создать issue-search.test.ts
- [ ] Тест: поиск → получение деталей
- [ ] Тест: batch получение
- [ ] Тест: mixed results
- [ ] Запустить тесты

---

### Шаг 5: E2E для Issue Tracking (0.5 дня)

**Файл:** `tests/e2e/workflows/issue-tracking.test.ts`

**Сценарии:**
1. Получение changelog после изменений
2. Получение доступных transitions
3. Workflow: обновить → проверить changelog

**Пример:**

```typescript
// tests/e2e/workflows/issue-tracking.test.ts
describe('Issue Tracking E2E', () => {
  describe('Changelog tracking', () => {
    it('должен отследить изменения через changelog', async () => {
      // Create issue
      mockServer.mockCreateIssueSuccess();
      const issueKey = await workflow.createIssue({
        queue: 'TEST',
        summary: 'Original',
      });

      // Update issue
      mockServer.mockUpdateIssueSuccess(issueKey);
      await workflow.updateIssue(issueKey, { summary: 'Updated' });

      // Get changelog
      mockServer.mockGetChangelogSuccess(issueKey);
      const result = await client.callTool(
        'fractalizer_mcp_yandex_tracker_get_issue_changelog',
        { issueKey }
      );

      const changelog = JSON.parse(result.content[0]!.text);
      assertChangelogHasChanges(changelog.data);
    });
  });

  describe('Transitions workflow', () => {
    it('должен получить доступные transitions и выполнить один', async () => {
      mockServer.mockCreateIssueSuccess();
      const issueKey = await workflow.createIssue({
        queue: 'TEST',
        summary: 'Test',
      });

      // Get available transitions
      mockServer.mockGetTransitionsSuccess(issueKey, [
        { id: 'start', to: { key: 'inProgress' } },
        { id: 'resolve', to: { key: 'resolved' } },
      ]);
      const result = await client.callTool(
        'fractalizer_mcp_yandex_tracker_get_issue_transitions',
        { issueKey }
      );

      const transitions = JSON.parse(result.content[0]!.text);
      expect(transitions.data).toHaveLength(2);

      // Execute first transition
      mockServer.mockTransitionIssueSuccess(issueKey, 'inProgress');
      await workflow.transitionIssue(issueKey, 'start');
    });
  });
});
```

**Чек-лист:**
- [ ] Создать issue-tracking.test.ts
- [ ] Тест: changelog после изменений
- [ ] Тест: получение transitions → выполнение
- [ ] Запустить тесты

---

### Шаг 6: Документация E2E подхода (1 час)

**Файл:** `tests/e2e/README.md`

**Содержание:**
- Назначение E2E тестов
- Разница с Integration тестами
- Структура и паттерны
- Как добавить новый E2E тест
- Примеры

**Чек-лист:**
- [ ] Создать tests/e2e/README.md
- [ ] Описать назначение E2E
- [ ] Добавить примеры workflows
- [ ] Документировать helpers

---

## ✅ Критерии завершения

### Must Have
- [x] 3+ E2E файла созданы (lifecycle, search, tracking)
- [x] Все E2E тесты проходят (`npm run test:e2e`)
- [x] WorkflowClient и assertion helpers реализованы
- [x] Документация E2E создана

### Should Have
- [x] 5+ E2E файлов
- [x] Coverage основных user workflows
- [x] Error handling в workflows

### Nice to Have
- [ ] Visual diagram workflows
- [ ] Performance метрики E2E тестов

---

## 🚨 Возможные проблемы

### Проблема 1: E2E тесты слишком медленные

**Решение:**
- Использовать параллельное выполнение
- Минимизировать моки (только необходимые)
- Группировать похожие тесты

### Проблема 2: Сложно поддерживать моки для workflows

**Решение:**
- Использовать MockServer helpers
- Создать preset workflows в mock-server.ts
- Документировать mock patterns

---

## 📝 Шаблон для PR

```markdown
# E2E тесты для основных API tools

## Изменения
- ✅ Добавлены E2E тесты для issue lifecycle
- ✅ Добавлены E2E тесты для issue search
- ✅ Добавлены E2E тесты для issue tracking
- ✅ Создан WorkflowClient helper
- ✅ Создана E2E документация

## Метрики
| Метрика | До | После |
|---------|-----|-------|
| E2E файлов | 1 | 4 |
| E2E тестов | ~20 | ~60 |
| Workflow coverage | 10% | 80% |

## Проверка
- [x] `npm run test:e2e` проходит
- [x] Все workflows покрыты
- [x] Документация создана

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

**Следующий этап:** [03-critical-skip-tests.md](./03-critical-skip-tests.md)
