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
