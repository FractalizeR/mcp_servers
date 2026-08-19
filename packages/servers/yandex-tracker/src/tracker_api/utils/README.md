# Utils — Вспомогательные утилиты

**Перед использованием утилит прочитай этот файл.**

---

## 🎯 Назначение Utils

**Utils** — вспомогательные классы для работы с API Яндекс.Трекера:
- Инкапсулируют переиспользуемую логику
- Чистые функции без side effects
- Используются в Operations и Tools

---

## 📁 Структура

```
src/tracker_api/utils/
├── tracker-paginator.util.ts   # TrackerPaginator
├── cursor-codec.util.ts        # CursorCodec (opaque-курсор)
├── item-budget.util.ts         # ItemBudget (общий бюджет batch)
├── strip-host.util.ts          # stripTrackerHost
├── file-upload.util.ts         # FileUploadUtil
├── file-download.util.ts       # FileDownloadUtil
├── duration.util.ts            # DurationUtil
└── index.ts                    # Экспорты
```

---

## 📊 TrackerPaginator

Доменная логика пагинации Яндекс.Трекера: проход по `Link rel="next"`
с защитными лимитами и сборка `PaginationMeta` из заголовков ответа.
Пагинация переведена на непрозрачный курсор; легаси-поле `page` и
`buildLegacyMeta` удалены — наружу отдаётся `pagination.nextCursor`.

Generic-примитивы (`parseLinkHeader`, нормализация заголовков) живут во
фреймворке `@fractalizer/mcp-infrastructure`; здесь — только доменная
политика Трекера (seek/`X-Total-*`, `maxItems`/`maxPages`, частичный отказ).

### Константы

- `DEFAULT_MAX_ITEMS = 500` — лимит по записям (прокси токенов агента).
- `DEFAULT_MAX_PAGES = 100` — backstop по числу страниц.
- `DEFAULT_MAX_PER_PAGE = 100` — рекомендуемый `perPage` для fetchAll.

### stripHost

Превращает абсолютный next-URL в относительный путь+query; defense-in-depth
guard отбрасывает пути не из `/v2/`|`/v3/` (возвращает `undefined`). Делегирует
в `stripTrackerHost` — общий модуль, разделяемый паджинатором и `CursorCodec`.

### buildMeta

Собирает `PaginationMeta` из заголовков и состояния обхода
(`hasNextPage`/`fetchedAll`/`truncated`/`hasError`). Ключевая политика:
- `hasNextPage`/`nextCursor` выводятся **только** из `Link rel="next"` (+ `truncated`);
- `total`/`totalPages` отдаются **только** при `Link rel="seek"` (seek-gating против
  ложного `totalPages` у cursor-эндпоинтов вроде comments);
- `nextCursor = CursorCodec.encode(path, tag, cursorExtra)` кодируется лишь при наличии
  `tag` (непагинируемые эндпоинты тег не передают → `nextCursor` отсутствует);
- `cursorExtra` — доп. нагрузка в курсоре (хеш тела `_search` для find_issues, R2).

### singlePage / fetchAllPages

`singlePage(response, { perPage?, tag?, cursorExtra? })` — оборачивает одну (первую)
страницу. `fetchAllPages(opts)` — полный обход по `Link rel="next"` до исчерпания или
защитного лимита; принимает `tag`/`cursorExtra` (включают cursor-режим), `maxItems`,
`maxPages`, `perPage`, общий `budget` (`ItemBudget`). При ошибке после страниц 1..N-1
возвращает частичный результат (`hasError=true`), собранное не теряется.

---

## 🔐 CursorCodec

Кодек непрозрачного (opaque) курсора пагинации. Курсор для агента — чёрный ящик:
он лишь передаёт `pagination.nextCursor` обратно тому же инструменту.

- `encode(relativePath, tag, extra?)` → `c1:` + base64url(JSON `{t,p,h?}`). `t` — тег
  семейства эндпоинта (`CURSOR_TAGS`), `p` — относительный next-путь, `h` — опц. доп.
  нагрузка (хеш тела `_search`).
- `decode(cursor, expectedTag)` → `{ path, extra? }`. **Никогда** не делает тихий fallback
  на первую страницу: при любой проблеме бросает `InvalidCursorError` — неизвестная версия
  (не `c1:`), битый base64/JSON/структура, mismatch тега (кросс-эндпоинт курсор), путь не
  из `/v[23]/` (guard через `stripTrackerHost`).
- `CURSOR_TAGS` — теги семейств (changelog/comments/links/worklog/checklist/queues/projects/
  findIssues). Непагинируемые components/attachments курсор не выдают и тега не имеют.
- `CURSOR_VERSION_PREFIX = 'c1:'` — версия формата (forward-compat).

---

## 📁 FileUploadUtil

Утилиты для работы с загрузкой файлов.

### prepareMultipartFormData

Подготовить multipart/form-data для загрузки файла:

```typescript
const buffer = Buffer.from('file content');
const formData = FileUploadUtil.prepareMultipartFormData(
  buffer,
  'document.pdf',
  'attachment'
);
// FormData готова для POST запроса
```

### validateFileSize

Валидация размера файла:

```typescript
const isValid = FileUploadUtil.validateFileSize(
  1024 * 1024,           // 1 MB
  10 * 1024 * 1024      // max 10 MB
);
// true
```

### getMimeType

Определить MIME тип файла по расширению:

```typescript
const mimeType = FileUploadUtil.getMimeType('document.pdf');
// 'application/pdf'

const mimeType = FileUploadUtil.getMimeType('image.jpg');
// 'image/jpeg'
```

### getFileExtension

Получить расширение файла:

```typescript
const ext = FileUploadUtil.getFileExtension('document.pdf');
// 'pdf'
```

### validateFilename

Валидация имени файла (проверка на path traversal и недопустимые символы):

```typescript
FileUploadUtil.validateFilename('document.pdf');      // true
FileUploadUtil.validateFilename('../etc/passwd');     // false
FileUploadUtil.validateFilename('file<script>.js');   // false
```

### formatFileSize

Форматировать размер файла для отображения:

```typescript
FileUploadUtil.formatFileSize(1024);           // "1.0 KB"
FileUploadUtil.formatFileSize(1024 * 1024);    // "1.0 MB"
FileUploadUtil.formatFileSize(1536);           // "1.5 KB"
```

---

## 🚨 Критические правила

### 1. Только статические методы

✅ **Правильно:**
```typescript
export class TrackerPaginator {
  static stripHost(url: string): string | undefined {
    // ...
  }
}
```

❌ **Неправильно:**
```typescript
export class TrackerPaginator {
  stripHost(url: string): string | undefined {
    // ...
  }
}
```

### 2. Чистые функции без side effects

✅ **Правильно:**
```typescript
static getMimeType(filename: string): string {
  const mimeType = lookup(filename);
  return mimeType !== false ? mimeType : 'application/octet-stream';
}
```

❌ **Неправильно:**
```typescript
// НЕ изменять глобальное состояние
static setDefaultMimeType(mimeType: string): void {
  globalMimeType = mimeType;
}
```

### 3. Валидация входных данных

✅ **Правильно:**
```typescript
static validateFileSize(size: number, maxSize: number): boolean {
  if (size < 0) {
    throw new Error('size must be non-negative');
  }
  return size <= maxSize;
}
```

---

## 📋 Чек-лист создания Utils

- [ ] Создать файл `src/tracker_api/utils/{name}.util.ts`
- [ ] **Создать класс с static методами:**
  - [ ] Только static методы
  - [ ] JSDoc комментарии для класса и методов
  - [ ] Валидация входных данных
  - [ ] Явная типизация параметров и возвращаемых значений
  - [ ] Примеры использования в JSDoc
- [ ] **Экспорт:**
  - [ ] Добавить в `utils/index.ts`:
    ```typescript
    export { FileUploadUtil } from './file-upload.util.js';
    ```
- [ ] **Тесты:**
  - [ ] Создать `tests/tracker_api/utils/{name}.util.test.ts`
  - [ ] Покрытие тестами ≥90%
  - [ ] Тесты на edge cases (пустые строки, null, undefined)
- [ ] `npm run validate` — проходит

---

## 🧪 Примеры использования в Operations

### Использование TrackerPaginator

```typescript
export class GetCommentsOperation extends BaseOperation {
  async execute(
    issueKey: string,
    input: GetCommentsInput
  ): Promise<PaginatedResult<CommentWithUnknownFields>> {
    // Курсор: один запрос по декодированному пути (perPage/expand уже вшиты в путь).
    if (input.cursor !== undefined) {
      const { path } = CursorCodec.decode(input.cursor, CURSOR_TAGS.comments);
      const resp = await this.httpClient.getWithResponse<CommentWithUnknownFields[]>(path);
      return TrackerPaginator.singlePage(resp, { tag: CURSOR_TAGS.comments });
    }

    const path = `/v3/issues/${issueKey}/comments`;
    const first = await this.httpClient.getWithResponse<CommentWithUnknownFields[]>(path);

    return input.fetchAll === true
      ? TrackerPaginator.fetchAllPages<CommentWithUnknownFields>({
          firstResponse: first,
          requestNext: (p) => this.httpClient.getWithResponse(p),
          tag: CURSOR_TAGS.comments,
          maxItems: input.maxItems,
        })
      : TrackerPaginator.singlePage(first, { tag: CURSOR_TAGS.comments, perPage: input.perPage });
  }
}
```

### Использование FileUploadUtil

```typescript
export class UploadAttachmentOperation extends BaseOperation {
  async execute(
    issueKey: string,
    file: Buffer,
    filename: string
  ): Promise<AttachmentWithUnknownFields> {
    // Валидация имени файла
    if (!FileUploadUtil.validateFilename(filename)) {
      throw new Error('Invalid filename');
    }

    // Валидация размера (макс 10MB)
    if (!FileUploadUtil.validateFileSize(file.length, 10 * 1024 * 1024)) {
      throw new Error('File too large');
    }

    // Подготовить FormData
    const formData = FileUploadUtil.prepareMultipartFormData(file, filename);

    // Загрузить файл
    return this.uploadFile<AttachmentWithUnknownFields>(
      `/v3/issues/${issueKey}/attachments`,
      formData
    );
  }
}
```

---

**Версия:** 2.0
**Обновлено:** 2025-01-18
