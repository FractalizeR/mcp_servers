# Operations — Конвенции разработки

**Перед созданием новой Operation ОБЯЗАТЕЛЬНО прочитай этот файл.**

---

## 🎯 Назначение Operations

**Operation** — бизнес-операция для работы с API Яндекс.Трекера:
- Инкапсулирует логику взаимодействия с конкретным endpoint
- Обрабатывает ошибки и преобразует их в `ApiError`
- Использует `ParallelExecutor` для batch-операций
- Возвращает типизированные данные (`*WithUnknownFields`)

**⚠️ ВАЖНО:** Operations — internal API, используются только через `YandexTrackerFacade`

---

## 📁 Структура

```
src/tracker_api/api_operations/{feature}/
├── {name}.operation.ts    # Класс Operation
├── index.ts               # Экспорты
```

**Примеры:**
- `api_operations/issue/get-issues.operation.ts`
- `api_operations/user/ping.operation.ts`

---

## 🏗️ Базовый класс BaseOperation

**Что предоставляет:**
- `httpClient: HttpClient` — для HTTP запросов
- `retryHandler: RetryHandler` — для retry логики (уже встроен в HttpClient)
- `cacheManager: CacheManager` — для кеширования
- `logger: Logger` — для логирования
- `withCache<T>(cacheKey, fn)` — helper метод для кеширования результата
- `deleteRequest<T>(endpoint)` — DELETE запрос (v2.0+)
- `uploadFile<T>(endpoint, formData)` — загрузка файлов (v2.0+)
- `downloadFile(endpoint)` — скачивание файлов как Buffer (v2.0+)

**Примечание:** `ParallelExecutor` создаётся в конкретных batch-операциях,
не передаётся через BaseOperation.

**Наследуй BaseOperation для всех операций:**
```typescript
export class GetIssuesOperation extends BaseOperation {
  async execute(issueKeys: string[]): Promise<BatchResult<IssueWithUnknownFields>> {
    // ...
  }
}
```

### Новые методы BaseOperation (v2.0+)

**DELETE запросы:**
```typescript
protected async deleteRequest<TResponse = void>(endpoint: string): Promise<TResponse>
```
Используется для удаления ресурсов (комментарии, связи, вложения).

**Загрузка файлов:**
```typescript
protected async uploadFile<TResponse>(endpoint: string, formData: FormData): Promise<TResponse>
```
Используется для загрузки файлов через `multipart/form-data`.

**Скачивание файлов:**
```typescript
protected async downloadFile(endpoint: string): Promise<Buffer>
```
Используется для скачивания файлов как `Buffer`.

---

## 📊 Типы результатов

### Batch-операции

✅ **Используй стандартные типы из `@types`:**
```typescript
import type { BatchResult } from '@types';

// Operation возвращает BatchResult<T>
async execute(keys: string[]): Promise<BatchResult<IssueWithUnknownFields>> {
  const results = await this.parallelExecutor.execute(
    keys,
    async (key) => this.fetchIssue(key)
  );

  // results уже в формате BatchResult
  return results;
}
```

### Одиночные операции

```typescript
async execute(): Promise<UserWithUnknownFields> {
  const response = await this.httpClient.get<User>('/v3/myself');
  return response; // User + unknown поля
}
```

---

## 🔄 Batch-операции через ParallelExecutor

**Для операций, работающих с массивом элементов:**

```typescript
async execute(issueKeys: string[]): Promise<BatchResult<IssueWithUnknownFields>> {
  // ParallelExecutor автоматически:
  // - Валидирует количество (не больше maxBatchSize)
  // - Выполняет параллельно (до maxConcurrentRequests)
  // - Возвращает BatchResult с fulfilled/rejected

  const operations = issueKeys.map((key) => ({
    key,
    fn: async () => {
      const cacheKey = EntityCacheKey.createKey(EntityType.Issue, key);
      return this.withCache(cacheKey, async () => {
        return this.httpClient.get<IssueWithUnknownFields>(`/v3/issues/${key}`);
      });
    },
  }));

  return this.parallelExecutor.executeParallel(operations, 'getIssues');
}
```

**⚠️ НЕ используй вручную `Promise.allSettled()` — используй `ParallelExecutor`**

---

## 🗄️ Кеширование

**Для GET операций с высокой частотой запросов:**

```typescript
import { EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';

const cacheKey = EntityCacheKey.createKey(EntityType.Issue, issueKey);
const issue = await this.withCache(cacheKey, async () => {
  return this.httpClient.get<IssueWithUnknownFields>(`/v3/issues/${issueKey}`);
});
```

**По умолчанию:** `NoOpCache` (без кеширования)
**Настройка:** Через DI container (будущее улучшение)

---

## 📊 Пагинация list-операций

List-операции возвращают `PaginatedResult<T> = { items: T[]; pagination: PaginationMeta }`
вместо «голого» массива. Логику инкапсулирует `TrackerPaginator` (`#tracker_api/utils`),
HTTP-заголовки даёт `getWithResponse`/`postWithResponse` (`@fractalizer/mcp-infrastructure`).
Пагинация переведена на единый непрозрачный курсор; параметр `page` **удалён** (breaking).

**Два механизма Трекера (определяет сервер, не клиент):**
- **Link `rel="next"`** (cursor) — GET-коллекции (changelog, comments, worklog, links,
  checklist, queues, projects). Идём по next-URL до исчерпания. `total`/`totalPages` НЕ
  заполняются (нет seek).
- **Seekable** — POST `_search` (find_issues), а также queues/projects: `Link rel="seek"`
  даёт `X-Total-Count`/`X-Total-Pages`. find_issues: следуем `Link rel="next"`, если он
  есть; иначе перебираем `page=1..X-Total-Pages` (внутренний fallback, наружу page не виден).
- **Непагинируемые** — components/attachments: возвращают все элементы за один ответ,
  `TrackerPaginator` не вызывают (нет `pagination` в выдаче).

**Курсор (для каждого пагинируемого эндпоинта свой `tag` из `CURSOR_TAGS`):**
- В ответе `pagination.nextCursor` = `CursorCodec.encode(next-путь, tag)` ⟺ есть `Link
  rel="next"`. При получении `cursor` операция вызывает `CursorCodec.decode(cursor, tag)`
  (битый/чужой курсор → `InvalidCursorError`) и делает один запрос по декодированному пути.
- `perPage`/`expand` уже вшиты в путь курсора → повторно их не передаём (для GET).

**Паттерн в операции (single GET):**
```typescript
async execute(key: string, input: GetCommentsInput): Promise<PaginatedResult<CommentWithUnknownFields>> {
  if (input.cursor !== undefined) {
    const { path } = CursorCodec.decode(input.cursor, CURSOR_TAGS.comments);
    const resp = await this.httpClient.getWithResponse<CommentWithUnknownFields[]>(path);
    return TrackerPaginator.singlePage(resp, { tag: CURSOR_TAGS.comments });
  }
  const path = this.buildPath(key, input);
  const first = await this.httpClient.getWithResponse<CommentWithUnknownFields[]>(path);
  return input.fetchAll === true
    ? TrackerPaginator.fetchAllPages({ firstResponse: first, requestNext: (p) => this.httpClient.getWithResponse(p), tag: CURSOR_TAGS.comments, maxItems: input.maxItems })
    : TrackerPaginator.singlePage(first, { tag: CURSOR_TAGS.comments, perPage: input.perPage });
}
```

**find_issues (replay + хеш тела, R2):** курсор кодирует next-путь + sha256 канонического
тела (`cursorExtra: bodyHash`). При возобновлении агент передаёт `cursor` + повторно
критерии (query/filter/keys/queue/filterId/order); операция канонизирует их, считает хеш и
сверяет с `extra` из курсора (mismatch → explicit error). `expand` в `Link` отсутствует —
дописывается к пути отдельно. Тело POST повторяется при каждом запросе цепочки.

**Batch:** каждая задача `ParallelExecutor` возвращает `PaginatedResult<T>`, итог —
`BatchResult<string, PaginatedResult<T>>` (tool распаковывает через `paginatedFieldFilter`).
В batch `cursor` валиден только при одном issueId (refine в схеме).

**Защитные лимиты (в записях, не страницах — прокси токенов агента):**
- `maxItems=500` — на одну цепочку пагинации (per-issue); при упоре `truncated=true`.
- `maxTotalItems=1000` — общий потолок на весь batch-ответ инструмента.
- `maxPages=100` — вторичный backstop от runaway.

**⚠️ Кеш-аудит (обязательно для каждой list-операции):** cache-key либо включает
пагинационные параметры (`cursor`/`perPage`/`fetchAll`/`maxItems`), либо при заданных
пагинационных параметрах кеш не используется. Иначе первая страница «залипает» в кеше
и `fetchAll` возвращает её же. Scroll API (>10000 результатов) — out of scope.

---

## 📋 Чек-лист создания Operation

- [ ] Создать файл `src/tracker_api/api_operations/{feature}/{name}.operation.ts`
- [ ] **Наследовать BaseOperation:**
  ```typescript
  export class NewOperation extends BaseOperation {
    async execute(params: ParamsDTO): Promise<ResultWithUnknownFields> {
      // ...
    }
  }
  ```
- [ ] **Для batch-операций:**
  - [ ] Использовать `ParallelExecutor.execute()`
  - [ ] Возвращать `BatchResult<T>`
  - [ ] Добавить кеширование через `EntityCacheKey` (если применимо)
- [ ] **Для одиночных операций:**
  - [ ] Использовать `this.httpClient.get/post/patch/delete()`
  - [ ] Возвращать `*WithUnknownFields`
- [ ] **Экспорт:**
  - [ ] Добавить в `api_operations/{feature}/index.ts`
  - [ ] Экспортировать типы результатов (если batch)
- [ ] **Facade метод:**
  - [ ] Создать публичный метод в `YandexTrackerFacade`
  - [ ] Делегировать вызов в Operation
- [ ] **АВТОМАТИЧЕСКАЯ РЕГИСТРАЦИЯ:**
  - [ ] Добавь класс в `src/composition-root/definitions/operation-definitions.ts`
  - [ ] ВСЁ! (DI регистрация, TYPES — автоматически)
- [ ] **Тесты:**
  - [ ] `tests/unit/tracker_api/api_operations/{feature}/{name}.operation.test.ts`
  - [ ] Успешный сценарий
  - [ ] Обработка ошибок API (404, 500, etc.)
  - [ ] Batch-операции: частичный успех
  - [ ] Покрытие ≥80%
- [ ] `npm run validate` — проходит

---

## 🚨 Критические правила

### 1. Использование API v2 и v3

**Яндекс.Трекер поддерживает два API:**
- **API v3** — новая версия (issues, queues, comments, links, changelog, transitions)
- **API v2** — старая версия (attachments, checklists, components, projects, worklogs)

**Правило:** Используй версию API согласно таблице ниже:

| Категория | API версия | Endpoint пример |
|-----------|------------|-----------------|
| Issues Core | v3 | `/v3/issues/{key}` |
| Queues | v3 | `/v3/queues/{id}` |
| Comments | v3 | `/v3/issues/{id}/comments` |
| Links | v3 | `/v3/issues/{id}/links` |
| Transitions | v3 | `/v3/issues/{id}/transitions` |
| Changelog | v3 | `/v3/issues/{id}/changelog` |
| User | v3 | `/v3/myself` |
| Attachments | v2 → **v3** | `/v2/issues/{id}/attachments` |
| Checklists | v2 → **v3** | `/v2/issues/{id}/checklistItems` |
| Components | v2 → **v3** | `/v2/queues/{id}/components` |
| Projects | v2 → **v3** | `/v2/projects` |
| Worklogs | v2 → **v3** | `/v2/issues/{id}/worklog` |
| Boards, колонки, спринты, глобальные поля, bulkchange | v2 → **v3** | в таблице ранее отсутствовали |

**`v2 → v3` означает: ходим в v2 сейчас, целевая версия v3.** v2 работает на совместимости,
документация описывает только v3; для проверенных семейств формы ответа совпадают (боевая проба
2026-08-23). Миграция — этап 4.1 плана `plan_tracker_test_coverage`. Новая операция пишется
сразу на v3.

✅ **Правильно:**
```typescript
// v3 для issues
this.httpClient.get('/v3/issues/PROJ-123');
this.httpClient.get('/v3/myself');

// v2 для attachments и worklogs
this.httpClient.get('/v2/issues/PROJ-123/attachments');
this.httpClient.post('/v2/issues/PROJ-123/worklog', {...});
```

❌ **Неправильно:**
```typescript
this.httpClient.get('/issues');    // Без версии
this.httpClient.get('/v1/issues'); // Неверная версия
```

**Примечание:** При появлении v3 версий для категорий на v2, приоритет отдаётся v3.

---

### 2. Типы с unknown полями

✅ **Правильно:**
```typescript
async execute(): Promise<IssueWithUnknownFields> {
  const issue = await this.httpClient.get<Issue>('/v3/issues/...');
  return issue; // Issue + unknown поля автоматически
}
```

❌ **Неправильно:**
```typescript
async execute(): Promise<Issue> { ... } // Теряем unknown поля
```

---

### 3. Обработка ошибок

**HttpClient автоматически преобразует ошибки в `ApiError`:**
- 404 → `{ statusCode: 404, message: '...' }`
- 429 → `{ statusCode: 429, message: '...', retryAfter: 60 }`
- 500 → `{ statusCode: 500, message: '...' }`

**⚠️ НЕ используй try-catch для обработки API ошибок** — они уже обработаны

---

### 4. Single Responsibility Principle

- Одна Operation = одна бизнес-операция
- НЕ смешивай CRUD операции в одном классе
- Пример: `GetIssuesOperation` ≠ `CreateIssueOperation`

---

## 📚 Примеры

### Batch-операция

См. эталонную реализацию: `src/tracker_api/api_operations/issue/get-issues.operation.ts`
- Использует `ParallelExecutor.executeParallel()`
- Кеширование через `EntityCacheKey`
- Возвращает `BatchResult<T>`

### Одиночная операция

См. эталонную реализацию: `src/tracker_api/api_operations/user/ping.operation.ts`
- Использует `httpClient.get()`
- Возвращает `*WithUnknownFields`
- Логирование через `this.logger`

---

## 📎 Attachment Operations (Complete API)

**5 операций для работы с вложениями:**

### 1. GetAttachmentsOperation
`GET /v2/issues/{issueId}/attachments` — получение списка файлов, кеш ✅

### 2. UploadAttachmentOperation
`POST /v2/issues/{issueId}/attachments` — загрузка файла (multipart/form-data), валидация размера (10MB)

### 3. DownloadAttachmentOperation
`GET /v2/issues/{issueId}/attachments/{attachmentId}/{filename}` — скачивание как Buffer

### 4. DeleteAttachmentOperation
`DELETE /v2/issues/{issueId}/attachments/{attachmentId}` — удаление файла, инвалидация кеша

### 5. GetThumbnailOperation
`GET /v2/issues/{issueId}/attachments/{attachmentId}/thumbnail/{filename}` — миниатюра изображения, кеш ✅

**Ключевые аспекты:**
- **API версия:** v2 (официально поддерживается Яндекс.Трекер)
- **Размер файла:** Default 10MB, настраивается через конфигурацию
- **Валидация:** `FileUploadUtil.validateFilename()`, `validateFileSize()`
- **Кодирование:** `encodeURIComponent()` для filename в URL
- **Кеш:** Список файлов кешируется, инвалидируется при upload/delete
- **MIME type:** Автоопределение через `FileUploadUtil.getMimeType()`

---

## 💬 Comment Operations (Complete API)

**4 операции для работы с комментариями:**

### 1. AddCommentOperation
`POST /v3/issues/{issueId}/comments` — добавление комментария, инвалидация кеша

### 2. GetCommentsOperation
`GET /v3/issues/{issueId}/comments` — получение списка, пагинация (perPage, page, expand), кеш ✅

### 3. EditCommentOperation
`PATCH /v3/issues/{issueId}/comments/{commentId}` — редактирование, обновляет version

### 4. DeleteCommentOperation
`DELETE /v3/issues/{issueId}/comments/{commentId}` — удаление, инвалидация кеша

**Ключевые аспекты:**
- **API версия:** v3 (актуальная версия API)
- **Markdown:** Поле `text` поддерживает markdown форматирование
- **Вложения:** Можно прикрепить файлы через `attachmentIds` при создании
- **Версионность:** Поле `version` используется для оптимистичной блокировки
- **Transport:** Комментарии могут быть созданы через UI ('internal') или email ('email')
- **Кеш:** Список комментариев кешируется, инвалидируется при add/edit/delete

---

## 🗂️ Queue Operations (Complete API)

**6 операций для работы с очередями:**

### 1. GetQueueOperation
**API:** `GET /v3/queues/{queueId}`
**Назначение:** Получение одной очереди по ID или ключу
- Кеш: ✅ (по ключу очереди)
- Параметр `expand` для дополнительных полей

### 2. GetQueuesOperation
**API:** `GET /v3/queues/`
**Назначение:** Получение списка всех очередей
- Кеш: ✅
- Параметры: `expand`, `perPage`, `page`

### 3. CreateQueueOperation
**API:** `POST /v3/queues/`
**Назначение:** Создание новой очереди
- Администраторская операция
- Валидация ключа: `^[A-Z]{2,10}$`
- Кеш: создаёт cache entry для новой очереди

### 4. UpdateQueueOperation
**API:** `PATCH /v3/queues/{queueId}`
**Назначение:** Обновление настроек очереди
- Кеш: ❌ инвалидирует cache для очереди
- Поддержка версионности (optimistic locking)

### 5. GetQueueFieldsOperation
**API:** `GET /v3/queues/{queueId}/fields`
**Назначение:** Получение списка полей очереди
- Кеш: ✅
- Возвращает настраиваемые поля очереди

### 6. ManageQueueAccessOperation
**API:** `POST /v3/queues/{queueId}/permissions`
**Назначение:** Управление доступом к очереди
- Кеш: ❌ инвалидирует permissions cache
- Роли: queue-lead, team-member, follower, access
- Batch операция для добавления/удаления прав

**Ключевые аспекты:**
- **API версия:** v3 (актуальная версия API)
- **Админ права:** create/update/manage-access требуют администраторских прав
- **Версионность:** `version` поле для оптимистичных блокировок
- **Кеш:** Очереди кешируются по ключу, инвалидируются при изменениях
- **Batch:** GetQueuesOperation поддерживает пагинацию

---

## 📦 Component Operations (Complete API)

**4 операции для работы с компонентами очередей:**

### 1. GetComponentsOperation
`GET /v2/queues/{queueId}/components` — список компонентов очереди, кеш ✅

### 2. CreateComponentOperation
`POST /v2/queues/{queueId}/components` — создание (name, description?, lead?, assignAuto?), инвалидация кеша

### 3. UpdateComponentOperation
`PATCH /v2/components/{componentId}` — обновление параметров, инвалидация кеша

### 4. DeleteComponentOperation
`DELETE /v2/components/{componentId}` — удаление, сначала GET для queueId

**Ключевые аспекты:**
- **API версия:** Компоненты используют API v2 (не v3)
- **Scope:** Компоненты привязаны к конкретной очереди
- **Auto-assign:** `assignAuto` — автоназначение исполнителя при добавлении компонента к задаче
- **Lead:** Опциональный ответственный за компонент
- **Кеш:** Списки компонентов кешируются по очереди, инвалидируются при изменениях
- **Delete:** При удалении сначала делает GET для получения queueId (для инвалидации кеша)

---

## ✅ Checklist Operations (Complete API)

**4 операции для работы с чеклистами задач:**

### 1. GetChecklistOperation
`GET /v2/issues/{issueId}/checklistItems` — получение всех элементов чеклиста задачи

**Пример использования:**
```typescript
const checklist = await getChecklistOperation.execute('QUEUE-123');
// Возвращает: ChecklistItemWithUnknownFields[]
```

### 2. AddChecklistItemOperation
`POST /v2/issues/{issueId}/checklistItems` — добавление нового элемента в чеклист

**Пример использования:**
```typescript
const newItem = await addChecklistItemOperation.execute('QUEUE-123', {
  text: 'Проверить документацию',
  checked: false,
  assignee: 'user-login',
  deadline: '2025-12-31T23:59:59Z'
});
// Возвращает: ChecklistItemWithUnknownFields
```

### 3. UpdateChecklistItemOperation
`PATCH /v2/issues/{issueId}/checklistItems/{checklistItemId}` — обновление существующего элемента

**Пример использования:**
```typescript
const updated = await updateChecklistItemOperation.execute(
  'QUEUE-123',
  'checklist-item-id',
  {
    text: 'Обновленный текст',
    checked: true
  }
);
// Возвращает: ChecklistItemWithUnknownFields
```

### 4. DeleteChecklistItemOperation
`DELETE /v2/issues/{issueId}/checklistItems/{checklistItemId}` — удаление элемента чеклиста

**Пример использования:**
```typescript
await deleteChecklistItemOperation.execute('QUEUE-123', 'checklist-item-id');
// Возвращает: void
```

**Ключевые аспекты:**
- **API версия:** Чеклисты используют API v2 (не v3)
- **Scope:** Чеклисты привязаны к конкретной задаче
- **Assignee:** Опциональное назначение ответственного за элемент (UserRef)
- **Deadline:** Опциональный дедлайн в формате ISO 8601
- **Checked:** Boolean статус выполнения элемента

---

## 🔗 См. также

- **Facade конвенции:** [src/tracker_api/facade/README.md](../facade/README.md)
- **Entities:** [src/tracker_api/entities/README.md](../entities/README.md)
- **DTO:** [src/tracker_api/dto/README.md](../dto/README.md)
- **DI:** [src/composition-root/README.md](../../composition-root/README.md)
- **MCP Tools:** [src/tools/README.md](../../tools/README.md)
