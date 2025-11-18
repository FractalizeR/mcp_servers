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
import { EntityCacheKey, EntityType } from '@infrastructure/cache/entity-cache-key.js';

const cacheKey = EntityCacheKey.createKey(EntityType.Issue, issueKey);
const issue = await this.withCache(cacheKey, async () => {
  return this.httpClient.get<IssueWithUnknownFields>(`/v3/issues/${issueKey}`);
});
```

**По умолчанию:** `NoOpCache` (без кеширования)
**Настройка:** Через DI container (будущее улучшение)

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

### 1. API v3 ТОЛЬКО

✅ **Правильно:**
```typescript
this.httpClient.get('/v3/issues/PROJ-123');
this.httpClient.get('/v3/myself');
```

❌ **Неправильно:**
```typescript
this.httpClient.get('/v2/issues'); // Старый API
this.httpClient.get('/issues');    // Без версии
```

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

**Эталон:** `src/tracker_api/api_operations/issue/get-issues.operation.ts`

```typescript
export class GetIssuesOperation extends BaseOperation {
  async execute(issueKeys: string[]): Promise<BatchResult<IssueWithUnknownFields>> {
    if (issueKeys.length === 0) {
      this.logger.warn('Пустой массив ключей');
      return [];
    }

    this.logger.info(`Получение ${issueKeys.length} задач`);

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
}
```

### Одиночная операция

**Эталон:** `src/tracker_api/api_operations/user/ping.operation.ts`

```typescript
export class PingOperation extends BaseOperation {
  async execute(): Promise<UserWithUnknownFields> {
    this.logger.info('Проверка доступности API');

    const user = await this.httpClient.get<User>('/v3/myself');

    this.logger.info(`API доступен. Текущий пользователь: ${user.login}`);
    return user;
  }
}
```

### Операции с файлами (Attachments)

**Эталон:** `src/tracker_api/api_operations/attachment/upload-attachment.operation.ts`

```typescript
export class UploadAttachmentOperation extends BaseOperation {
  async execute(
    issueId: string,
    input: UploadAttachmentInput
  ): Promise<AttachmentWithUnknownFields> {
    const { filename, file, mimetype } = input;

    // Конвертация base64 в Buffer если нужно
    const buffer = typeof file === 'string' ? Buffer.from(file, 'base64') : file;

    // Валидация размера и имени файла
    FileUploadUtil.validateFilename(filename);
    FileUploadUtil.validateFileSize(buffer.length, this.maxFileSize);

    // Подготовка FormData для multipart/form-data
    const formData = FileUploadUtil.prepareMultipartFormData(buffer, filename);

    // Загрузка через BaseOperation.uploadFile()
    const attachment = await this.uploadFile<AttachmentWithUnknownFields>(
      `/v2/issues/${issueId}/attachments`,
      formData
    );

    // Инвалидация кеша списка файлов
    const listCacheKey = EntityCacheKey.createKey(EntityType.ATTACHMENT, `list:${issueId}`);
    this.cacheManager.delete(listCacheKey);

    return attachment;
  }
}
```

**Эталон:** `src/tracker_api/api_operations/attachment/download-attachment.operation.ts`

```typescript
export class DownloadAttachmentOperation extends BaseOperation {
  async execute(issueId: string, attachmentId: string, filename: string): Promise<Buffer> {
    // Используем BaseOperation.downloadFile() для получения бинарных данных
    const buffer = await this.downloadFile(
      `/v2/issues/${issueId}/attachments/${attachmentId}/${encodeURIComponent(filename)}`
    );

    this.logger.info(`Файл ${filename} скачан, размер=${buffer.length} байт`);
    return buffer;
  }
}
```

**Особенности работы с файлами:**
- `uploadFile()` — для multipart/form-data загрузки
- `downloadFile()` — для скачивания бинарных данных
- Валидация через `FileUploadUtil` (размер, имя файла, MIME type)
- Инвалидация кеша после модификаций (upload, delete)
- Кодирование имени файла через `encodeURIComponent()` в URL

---

## 📎 Attachment Operations (Complete API)

**5 операций для работы с вложениями:**

### 1. GetAttachmentsOperation
**API:** `GET /v2/issues/{issueId}/attachments`
**Назначение:** Получение списка всех файлов задачи

```typescript
const attachments = await getAttachmentsOp.execute('QUEUE-123');
// Кеш: ✅ (через EntityCacheKey)
// Возврат: AttachmentWithUnknownFields[]
```

### 2. UploadAttachmentOperation
**API:** `POST /v2/issues/{issueId}/attachments`
**Назначение:** Загрузка файла через multipart/form-data

```typescript
const attachment = await uploadOp.execute('QUEUE-123', {
  filename: 'report.pdf',
  file: Buffer.from('...'),  // или base64 string
  mimetype: 'application/pdf'
});
// Валидация: размер (default 10MB), имя файла
// Кеш: ❌ инвалидирует list cache
// Возврат: AttachmentWithUnknownFields
```

### 3. DownloadAttachmentOperation
**API:** `GET /v2/issues/{issueId}/attachments/{attachmentId}/{filename}`
**Назначение:** Скачивание файла как Buffer

```typescript
const buffer = await downloadOp.execute('QUEUE-123', '67890', 'report.pdf');
// Возврат: Buffer (бинарные данные)
```

**Дополнительно:** `getMetadata()` для получения информации без скачивания

### 4. DeleteAttachmentOperation
**API:** `DELETE /v2/issues/{issueId}/attachments/{attachmentId}`
**Назначение:** Удаление файла из задачи

```typescript
await deleteOp.execute('QUEUE-123', '67890');
// Кеш: ❌ инвалидирует list cache
// Возврат: void
```

### 5. GetThumbnailOperation
**API:** `GET /v2/issues/{issueId}/attachments/{attachmentId}/thumbnail/{filename}`
**Назначение:** Получение миниатюры изображения

```typescript
const thumbnail = await getThumbnailOp.execute('QUEUE-123', '67890', 'photo.jpg');
// Кеш: ✅
// Возврат: Buffer (только для изображений)
```

**Ключевые аспекты:**
- **Размер файла:** Default 10MB, настраивается через конфигурацию
- **Валидация:** `FileUploadUtil.validateFilename()`, `validateFileSize()`
- **Кодирование:** `encodeURIComponent()` для filename в URL
- **Кеш:** Список файлов кешируется, инвалидируется при upload/delete
- **MIME type:** Автоопределение через `FileUploadUtil.getMimeType()`

---

## 💬 Comment Operations (Complete API)

**4 операции для работы с комментариями:**

### 1. AddCommentOperation
**API:** `POST /v2/issues/{issueId}/comments`
**Назначение:** Добавление комментария к задаче

```typescript
const comment = await addCommentOp.execute('QUEUE-123', {
  text: 'New comment',
  attachmentIds: ['att-1', 'att-2']  // опционально
});
// Кеш: ❌ инвалидирует list cache
// Возврат: CommentWithUnknownFields
```

### 2. GetCommentsOperation
**API:** `GET /v2/issues/{issueId}/comments`
**Назначение:** Получение списка комментариев задачи

```typescript
const comments = await getCommentsOp.execute('QUEUE-123', {
  perPage: 50,
  page: 1,
  expand: 'attachments'  // опционально
});
// Кеш: ✅ (через EntityCacheKey)
// Возврат: CommentWithUnknownFields[]
```

**Параметры пагинации:**
- `perPage` — количество комментариев на странице (default: 50)
- `page` — номер страницы (начиная с 1)
- `expand` — дополнительные поля ('attachments')

### 3. EditCommentOperation
**API:** `PATCH /v2/issues/{issueId}/comments/{commentId}`
**Назначение:** Редактирование существующего комментария

```typescript
const updatedComment = await editCommentOp.execute('QUEUE-123', 'comment-456', {
  text: 'Updated comment text'
});
// Кеш: ❌ инвалидирует list cache
// Возврат: CommentWithUnknownFields
```

**Важно:** При редактировании обновляются поля `updatedBy`, `updatedAt` и `version`

### 4. DeleteCommentOperation
**API:** `DELETE /v2/issues/{issueId}/comments/{commentId}`
**Назначение:** Удаление комментария

```typescript
await deleteCommentOp.execute('QUEUE-123', 'comment-456');
// Кеш: ❌ инвалидирует list cache
// Возврат: void
```

**Ключевые аспекты:**
- **Markdown:** Поле `text` поддерживает markdown форматирование
- **Вложения:** Можно прикрепить файлы через `attachmentIds` при создании
- **Версионность:** Поле `version` используется для оптимистичной блокировки
- **Transport:** Комментарии могут быть созданы через UI ('internal') или email ('email')
- **Кеш:** Список комментариев кешируется, инвалидируется при add/edit/delete

---

## 🔗 См. также

- **Facade конвенции:** [src/tracker_api/facade/README.md](../facade/README.md) (если создашь)
- **Entities:** [src/tracker_api/entities/CONVENTIONS.md](../entities/CONVENTIONS.md)
- **DTO:** [src/tracker_api/dto/CONVENTIONS.md](../dto/CONVENTIONS.md)
- **DI:** [src/composition-root/CONVENTIONS.md](../../composition-root/CONVENTIONS.md)
