# YandexTrackerFacade — Service-Based Architecture

**Паттерн**: Facade Pattern + Dependency Injection
**Ответственность**: Единая точка входа для всех операций с API Яндекс.Трекера

---

## 🎯 Архитектура

```
YandexTrackerFacade (< 150 LOC, только делегирование)
        ↓
14 Доменных Сервисов (< 200 LOC каждый)
        ↓
API Operations (конкретные HTTP запросы)
```

### Принципы

- **SRP (Single Responsibility)**: Facade ТОЛЬКО делегирует вызовы сервисам
- **NO Business Logic**: Вся бизнес-логика в доменных сервисах
- **Type-Safe DI**: Все зависимости через InversifyJS с декораторами `@inject`
- **NO Manual Initialization**: Всё извлекается из DI контейнера

---

## 📦 Доменные Сервисы (14)

### 1. UserService
- **Методы**: `ping()`
- **Домен**: Управление пользователями и проверка подключения

### 2. IssueService
- **Методы**: `getIssues()`, `findIssues()`, `createIssue()`, `updateIssue()`, `getIssueChangelog()`, `getIssueTransitions()`, `transitionIssue()`
- **Домен**: CRUD операции для задач

### 3. IssueLinkService
- **Методы**: `getIssueLinks()`, `createLink()`, `deleteLink()`
- **Домен**: Связи между задачами

### 4. IssueAttachmentService
- **Методы**: `getAttachments()`, `uploadAttachment()`, `downloadAttachment()`, `deleteAttachment()`, `getThumbnail()`
- **Домен**: Работа с файлами задач

### 5. QueueService
- **Методы**: `getQueues()`, `getQueue()`, `createQueue()`, `updateQueue()`, `getQueueFields()`, `manageQueueAccess()`
- **Домен**: Управление очередями

### 6. ComponentService
- **Методы**: `getComponents()`, `createComponent()`, `updateComponent()`, `deleteComponent()`
- **Домен**: Компоненты очередей

### 7. FieldService
- **Методы**: `getFields()`, `getField()`, `createField()`, `updateField()`, `deleteField()`
- **Домен**: Кастомные поля

### 8. CommentService
- **Методы**: `addComment()`, `getComments()`, `editComment()`, `deleteComment()`
- **Домен**: Комментарии к задачам

### 9. ChecklistService
- **Методы**: `getChecklist()`, `addChecklistItem()`, `updateChecklistItem()`, `deleteChecklistItem()`
- **Домен**: Чеклисты задач

### 10. WorklogService
- **Методы**: `getWorklogs()`, `addWorklog()`, `updateWorklog()`, `deleteWorklog()`
- **Домен**: Учет времени по задачам

### 11. BulkChangeService
- **Методы**: `bulkUpdateIssues()`, `bulkTransitionIssues()`, `bulkMoveIssues()`, `getBulkChangeStatus()`
- **Домен**: Массовые операции над задачами

### 12. ProjectService
- **Методы**: `getProjects()`, `getProject()`, `createProject()`, `updateProject()`, `deleteProject()`
- **Домен**: Управление проектами

### 13. BoardService
- **Методы**: `getBoards()`, `getBoard()`, `createBoard()`, `updateBoard()`, `deleteBoard()`
- **Домен**: Доски (Scrum/Kanban)

### 14. SprintService
- **Методы**: `getSprints()`, `getSprint()`, `createSprint()`, `updateSprint()`
- **Домен**: Спринты

---

## 🔧 Использование

### Через DI контейнер (Production)

```typescript
import { container } from '#composition-root/container.js';
import { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';

// Автоматическое разрешение всех 14 сервисов
const facade = container.get(YandexTrackerFacade);

// Использование
const result = await facade.ping();
const issues = await facade.findIssues({ query: 'status: open' });
```

### Ручная инъекция (Testing)

```typescript
import { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import { UserService, IssueService /* ... */ } from '#tracker_api/facade/services/index.js';

// Создаём моки сервисов
const mockUserService = { ping: vi.fn() } as unknown as UserService;
const mockIssueService = { /* ... */ } as unknown as IssueService;
// ... остальные 12 сервисов

// Инжектим моки
const facade = new YandexTrackerFacade(
  mockUserService,
  mockIssueService,
  mockIssueLinkService,
  mockIssueAttachmentService,
  mockQueueService,
  mockComponentService,
  mockFieldService,
  mockCommentService,
  mockChecklistService,
  mockWorklogService,
  mockBulkChangeService,
  mockProjectService,
  mockBoardService,
  mockSprintService
);
```

---

## 📊 Метрики

| Метрика | До рефакторинга | После рефакторинга |
|---------|-----------------|---------------------|
| Facade LOC | 1080+ | ~870 (с JSDoc), ~410 (код) |
| Max LOC/сервис | N/A | <200 |
| Сервисов | 0 | 14 |
| Методов | 61 | 61 (без изменений) |
| Cyclomatic Complexity | Высокая | Низкая (только делегирование) |

---

## 🧪 Тестирование

### Unit тесты

Все тесты находятся в `tests/tracker_api/facade/yandex-tracker.facade.test.ts`.

**Стратегия**:
- Мокаем 14 сервисов через `vi.fn()`
- Проверяем делегирование вызовов (facade → service)
- Проверяем передачу параметров и возврат результатов

**Пример теста**:

```typescript
it('должна делегировать вызов IssueService.findIssues', async () => {
  const params: FindIssuesInputDto = { query: 'status: open', perPage: 50 };
  const mockResult: FindIssuesResult = [/* ... */];

  vi.mocked(mockIssueService.findIssues).mockResolvedValue(mockResult);

  const result = await facade.findIssues(params);

  expect(mockIssueService.findIssues).toHaveBeenCalledWith(params);
  expect(result).toEqual(mockResult);
});
```

**Запуск тестов**:

```bash
# Все тесты facade
npm test -- tests/tracker_api/facade/

# Только facade тесты (37 тестов)
npm test -- tests/tracker_api/facade/yandex-tracker.facade.test.ts
```

---

## ✅ DoD (Definition of Done)

- [x] Facade <150 строк кода (без JSDoc)
- [x] 14 сервисов созданы (<200 строк каждый)
- [x] Все 61 метод сохранили сигнатуры
- [x] Все JSDoc сохранены
- [x] Нет циклических зависимостей
- [x] Все тесты проходят (37 passed)
- [x] DI регистрация настроена (toSelf())

---

## 🔗 Ссылки

- **Services**: [./services/](./services/)
- **Facade код**: [./yandex-tracker.facade.ts](./yandex-tracker.facade.ts)
- **DI регистрация**: [../../composition-root/facade-services.ts](../../composition-root/facade-services.ts)
- **Тесты**: [../../../tests/tracker_api/facade/yandex-tracker.facade.test.ts](../../../tests/tracker_api/facade/yandex-tracker.facade.test.ts)
- **План рефакторинга**: [../../../../.agentic-planning/plan_architecture_execution/FACADE_REFACTORING_PLAN.md](../../../../.agentic-planning/plan_architecture_execution/FACADE_REFACTORING_PLAN.md)

---

**Дата последнего обновления**: 2025-11-22
**Статус**: ✅ Рефакторинг завершен (Фазы 0-5 ✅)
