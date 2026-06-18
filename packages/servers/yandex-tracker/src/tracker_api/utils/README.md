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
├── file-upload.util.ts         # FileUploadUtil
├── file-download.util.ts       # FileDownloadUtil
├── duration.util.ts            # DurationUtil
└── index.ts                    # Экспорты
```

---

## 📊 TrackerPaginator

Доменная логика пагинации Яндекс.Трекера: проход по `Link rel="next"`
с защитными лимитами и сборка `PaginationMeta` из заголовков ответа.

Generic-примитивы (`parseLinkHeader`, нормализация заголовков) живут во
фреймворке `@fractalizer/mcp-infrastructure`; здесь — только доменная
политика Трекера (seek/`X-Total-*`, `maxItems`/`maxPages`, частичный отказ).

### Константы

- `DEFAULT_MAX_ITEMS = 500` — лимит по записям (прокси токенов агента).
- `DEFAULT_MAX_PAGES = 100` — backstop по числу страниц.
- `DEFAULT_MAX_PER_PAGE = 100` — рекомендуемый `perPage` для fetchAll.

### stripHost

Превращает абсолютный next-URL в относительный путь+query; defense-in-depth
guard отбрасывает пути не из `/v2/`|`/v3/` (возвращает `undefined`).

### buildMeta

Собирает `PaginationMeta` из заголовков (`X-Total-Count`/`X-Total-Pages`)
и состояния обхода (`hasNextPage`/`fetchedAll`/`truncated`/`hasError`).

### fetchAllPages

Полный обход по `Link rel="next"` до исчерпания или защитного лимита.
При ошибке после страниц 1..N-1 возвращает частичный результат
(`hasError=true`), собранное не теряется.

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
    params: PaginationParams & { fetchAll?: boolean; maxItems?: number }
  ): Promise<PaginatedResult<CommentWithUnknownFields>> {
    const path = `/v3/issues/${issueKey}/comments`;
    const first = await this.httpClient.getWithResponse<CommentWithUnknownFields[]>(path, params);

    if (!params.fetchAll) {
      return {
        items: first.data,
        pagination: TrackerPaginator.buildMeta({
          headers: first.headers,
          pagesFetched: 1,
          truncated: false,
          hasError: false,
          nextUrl: undefined, // вычисляется из Link заголовка first.headers
          page: params.page,
          perPage: params.perPage,
        }),
      };
    }

    return TrackerPaginator.fetchAllPages<CommentWithUnknownFields>({
      firstResponse: first,
      requestNext: (p) => this.httpClient.getWithResponse(p),
      maxItems: params.maxItems,
    });
  }
}
```

> Точная разводка single-page/fetchAll и cache-key — этап 2 плана пагинации.

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
