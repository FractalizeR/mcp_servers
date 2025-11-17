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
├── workflows/              # E2E сценарии
│   ├── issue-lifecycle.test.ts  # Создать → Обновить → Перевести
│   ├── issue-search.test.ts     # Поиск и фильтрация задач
│   └── issue-tracking.test.ts   # Changelog и transitions
├── helpers/
│   ├── workflow-client.ts       # Wrapper для multi-step workflows
│   └── assertion-helpers.ts     # Переиспользуемые assertions
└── README.md
```

## Использование helpers

### WorkflowClient

`WorkflowClient` предоставляет методы для multi-step workflows:

```typescript
import { WorkflowClient } from '../helpers/workflow-client.js';

const workflow = new WorkflowClient(client);

// Создать задачу
const issueKey = await workflow.createIssue({
  queue: 'TEST',
  summary: 'Test issue',
});

// Обновить задачу
await workflow.updateIssue(issueKey, { summary: 'Updated' });

// Выполнить переход
await workflow.transitionIssue(issueKey, 'start');

// Получить задачу
const issue = await workflow.getIssue(issueKey);

// Найти задачи
const issues = await workflow.findIssues('queue: TEST');

// Получить changelog
const changelog = await workflow.getChangelog(issueKey);

// Получить transitions
const transitions = await workflow.getTransitions(issueKey);
```

### Assertion Helpers

```typescript
import {
  assertIssueStructure,
  assertIssueStatus,
  assertIssuesContainKeys,
  assertChangelogStructure,
  assertTransitionsStructure,
} from '../helpers/assertion-helpers.js';

// Проверить структуру задачи
assertIssueStructure(issue);

// Проверить статус задачи
assertIssueStatus(issue, 'inProgress');

// Проверить что массив содержит задачи
assertIssuesContainKeys(issues, ['TEST-1', 'TEST-2']);

// Проверить структуру changelog
assertChangelogStructure(changelog);

// Проверить структуру transitions
assertTransitionsStructure(transitions);
```

## MockServer для E2E тестов

E2E тесты используют методы MockServer с префиксом `e2e_`:

```typescript
import { createMockServer } from '@integration/helpers/mock-server.js';

const mockServer = createMockServer(client.getAxiosInstance());

// E2E методы (с префиксом e2e_)
mockServer.e2e_createIssueSuccess({ key: 'TEST-1' });
mockServer.e2e_updateIssueSuccess('TEST-1', { summary: 'Updated' });
mockServer.e2e_transitionIssueSuccess('TEST-1', 'start');
mockServer.e2e_getChangelogSuccess('TEST-1');
mockServer.e2e_getTransitionsSuccess('TEST-1');
```

## Примеры E2E workflows

### Issue Lifecycle

Полный цикл жизни задачи: создание → обновление → переход:

```typescript
it('должен выполнить полный цикл: создать → обновить → перевести', async () => {
  // Создать
  mockServer.e2e_createIssueSuccess({ key: 'TEST-123' });
  const issueKey = await workflow.createIssue({
    queue: 'TEST',
    summary: 'E2E Test Issue',
  });

  // Обновить
  mockServer.e2e_updateIssueSuccess(issueKey, { summary: 'Updated' });
  await workflow.updateIssue(issueKey, { summary: 'Updated' });

  // Перевести
  mockServer.e2e_transitionIssueSuccess(issueKey, 'inProgress');
  await workflow.transitionIssue(issueKey, 'inProgress');

  // Проверить финальное состояние
  mockServer.mockGetIssueSuccess(issueKey, { status: { key: 'inProgress' } });
  const finalIssue = await workflow.getIssue(issueKey);

  assertIssueStructure(finalIssue);
  assertIssueStatus(finalIssue, 'inProgress');
});
```

### Issue Search Workflow

Создание → Поиск → Обновление:

```typescript
it('должен выполнить workflow: создать → найти → обновить', async () => {
  // Создать
  mockServer.e2e_createIssueSuccess({ key: 'TEST-100' });
  const issueKey = await workflow.createIssue({
    queue: 'TEST',
    summary: 'Searchable Issue',
  });

  // Найти
  mockServer.mockFindIssuesSuccess([issueKey]);
  const foundIssues = await workflow.findIssues(`key: ${issueKey}`);

  // Обновить найденную задачу
  mockServer.e2e_updateIssueSuccess(issueKey, { summary: 'Updated' });
  await workflow.updateIssue(issueKey, { summary: 'Updated' });

  assertIssuesContainKeys(foundIssues, [issueKey]);
});
```

### Issue Tracking Workflow

Создание → Transitions → Переход → Changelog:

```typescript
it('должен отслеживать изменения: создать → transitions → перевести → changelog', async () => {
  // Создать
  mockServer.e2e_createIssueSuccess({ key: 'TEST-202' });
  const issueKey = await workflow.createIssue({
    queue: 'TEST',
    summary: 'Tracked Issue',
  });

  // Получить доступные transitions
  mockServer.e2e_getTransitionsSuccess(issueKey);
  const transitions = await workflow.getTransitions(issueKey);

  // Выполнить переход
  mockServer.e2e_transitionIssueSuccess(issueKey, 'start');
  await workflow.transitionIssue(issueKey, 'start');

  // Получить changelog
  mockServer.e2e_getChangelogSuccess(issueKey);
  const changelog = await workflow.getChangelog(issueKey);

  assertTransitionsStructure(transitions);
  assertChangelogStructure(changelog);
});
```

## Когда добавлять E2E тесты

E2E тесты добавляются для проверки полных user workflows, включающих 2+ операций.
