# MCP Tools — Yandex Tracker Конвенции

**Разработка MCP tools для Yandex.Tracker сервера**

---

## 🎯 Назначение

**MCP Tools** — это набор инструментов, которые Claude использует для взаимодействия с Яндекс.Трекер API.

**Текущая структура:**
- **API Tools** — работа с Яндекс.Трекер (задачи, проекты, комментарии, работа с очередями)
- **Helper Tools** — утилиты (ping, search_tools)

**Слоистая архитектура:**
```
MCP Tool → YandexTrackerFacade → API Operation → HttpClient → Яндекс.Трекер API
```

---

## 📁 Структура

```
src/tools/
├── api/                          # API tools (работа с Tracker)
│   ├── issues/
│   │   ├── get/
│   │   │   ├── get-issues.definition.ts
│   │   │   ├── get-issues.schema.ts
│   │   │   └── get-issues.tool.ts
│   │   ├── create/
│   │   ├── update/
│   │   ├── links/                # Связи между задачами
│   │   ├── comments/             # Комментарии к задачам
│   │   └── attachments/          # Файловые вложения
│   │       ├── get/
│   │       ├── upload/
│   │       ├── download/
│   │       ├── delete/
│   │       └── thumbnail/
│   ├── projects/
│   └── queues/
├── helpers/                      # Вспомогательные tools
│   ├── ping/
│   └── search-tools/
├── ping.definition.ts            # Корневой ping tool
└── ping.tool.ts
```

---

## 🚨 КРИТИЧЕСКИЕ ПРАВИЛА

### 1. Используй Facade, НЕ Operations напрямую

**❌ ЗАПРЕЩЕНО:**
```typescript
constructor(
  private getIssuesOp: GetIssuesOperation  // WRONG!
) {}
```

**✅ ПРАВИЛЬНО:**
```typescript
constructor(
  private trackerFacade: YandexTrackerFacade
) {}

execute() {
  const results = await this.trackerFacade.getIssues(keys);
}
```

**Причина:** Facade инкапсулирует бизнес-логику, может объединять несколько операций, легче тестировать

---

### 2. Обязательные компоненты Tool

**Каждый tool ДОЛЖЕН иметь:**

1. **Static METADATA** — для Tool Search Engine + категоризация
```typescript
static readonly METADATA: ToolMetadata = {
  name: 'get_issues',
  description: '[Issues/Read] Получить задачи по ключам',
  category: 'issues',              // ОБЯЗАТЕЛЬНО
  subcategory: 'read',             // Опционально (read/write/workflow)
  priority: 'critical',            // Опционально (critical/high/normal/low)
  tags: ['issues', 'read', 'get'], // Опционально
  inputSchema: {...}
};
```

2. **Zod Schema** — валидация параметров
```typescript
const GetIssuesParamsSchema = z.object({
  keys: z.array(z.string()).min(1).max(200),
  fields: FieldsSchema.optional(),
  expand: ExpandSchema.optional(),
});
```

3. **Definition** — MCP ToolDefinition
```typescript
getDefinition(): ToolDefinition {
  return GetIssuesDefinition.build();
}
```

4. **Response Field Filter** — экономия токенов (80-90%)
```typescript
const filtered = ResponseFieldFilter.filter(data, params.fields);
return this.formatSuccess({ issues: filtered });
```

---

## 🏷️ Категоризация инструментов

### Обязательные метаданные

**Каждый инструмент ДОЛЖЕН иметь:**
- `category` (обязательно) — основная категория
- `subcategory` (опционально) — подкатегория для группировки
- `priority` (опционально, default: 'normal') — приоритет для сортировки
- `tags` (опционально) — теги для поиска через search_tools

### Категории и subcategories

| Category | Описание | Subcategories |
|----------|----------|---------------|
| `issues` | Работа с задачами | `read`, `write`, `workflow` |
| `helpers` | Вспомогательные инструменты | `url`, `demo`, `utils` |
| `system` | Системные инструменты | `health`, `config` |

### Приоритеты

**Порядок в tools/list:** critical → high → normal → low → алфавит

| Priority | Когда использовать | Примеры |
|----------|-------------------|---------|
| `critical` | Частое использование, ключевые операции | create_issue, find_issues, get_issues, update_issue |
| `high` | Важные, но не критичные операции | transitions, changelog |
| `normal` | Обычные операции | helpers, utilities |
| `low` | Редкое использование, демо | demo, debug tools |

### Description Convention

**Формат:** `[Category/Subcategory] Краткое описание`

**Правила:**
- Префикс категории в квадратных скобках
- Краткое описание (≤60 символов)
- Без упоминания "Яндекс.Трекер" (контекст понятен)
- Без дублирования информации из имени

**Примеры:**
```typescript
✅ '[Issues/Write] Создать задачу'
✅ '[Issues/Read] Найти задачи по фильтру'
✅ '[Helpers/URL] Получить ссылку на задачу'
✅ '[System/Health] Проверка доступности сервера'

❌ 'Создать новую задачу в Яндекс.Трекере' // Нет префикса, многословно
❌ '[Issues/Write] Создание новых задач с поддержкой...' // Длинно
```

### Чек-лист для нового инструмента

При создании нового tool:
- [ ] Определить `category` из существующих (или создать новую если нужно)
- [ ] Определить `subcategory` (read/write/workflow/etc)
- [ ] Определить `priority` на основе частоты использования
- [ ] Добавить `tags` для поиска (3-5 тегов)
- [ ] Написать краткий `description` с префиксом категории
- [ ] Проверить длину: `description.length ≤ 80`
- [ ] Добавить подробное описание параметров в `inputSchema`

---

### 3. Флаг безопасности `requiresExplicitUserConsent`

**⚠️ Если tool ИЗМЕНЯЕТ данные:**
```typescript
static readonly METADATA: StaticToolMetadata = {
  name: 'fyt_mcp_update_issue',
  requiresExplicitUserConsent: true,  // ⚠️ ОБЯЗАТЕЛЬНО
};
```

**✅ Если tool только ЧИТАЕТ:**
```typescript
static readonly METADATA: StaticToolMetadata = {
  name: 'fyt_mcp_get_issues',
  // requiresExplicitUserConsent отсутствует (или false)
};
```

**Проверка:** `npm run validate:tools`

**Опасные операции:** `update`, `create`, `delete`, `transition`, `execute`
**Безопасные операции:** `get`, `find`, `search`, `list`, `ping`

---

### 4. Batch-операции

**✅ Используй BatchResultProcessor для обработки:**
```typescript
const processed = BatchResultProcessor.process(
  results,
  (item) => ResponseFieldFilter.filter(item, params.fields)
);

// Структура:
// { successful: [{ key, data }], failed: [{ key, error }] }
```

**✅ Логируй результаты через ResultLogger:**
```typescript
ResultLogger.logBatchSuccess(this.logger, 'get_issues', {
  totalRequested: keys.length,
  successful: processed.successful.length,
  failed: processed.failed.length,
});
```

---

## 📋 Процесс создания нового API Tool

### Шаг 1: Создать структуру файлов

```bash
mkdir -p src/tools/api/{feature}/{action}/
cd src/tools/api/{feature}/{action}/

# Создать файлы:
# - {action}-{feature}.schema.ts
# - {action}-{feature}.definition.ts
# - {action}-{feature}.tool.ts
# - index.ts
```

### Шаг 2: Schema (Zod валидация)

```typescript
// get-issues.schema.ts
import { z } from 'zod';
import { IssueKeySchema, FieldsSchema } from '@mcp-framework/core';

export const GetIssuesParamsSchema = z.object({
  keys: z.array(IssueKeySchema).min(1).max(200),
  fields: FieldsSchema.optional(),
});

export type GetIssuesParams = z.infer<typeof GetIssuesParamsSchema>;
```

**Переиспользуй схемы** из `@mcp-framework/core`:
- `IssueKeySchema` — ключ задачи
- `FieldsSchema` — фильтр полей
- `ExpandSchema` — expand параметры

---

### Шаг 3: Definition (MCP ToolDefinition)

```typescript
// get-issues.definition.ts
export class GetIssuesDefinition {
  static build(): ToolDefinition {
    return {
      name: GetIssuesTool.METADATA.name,
      description: this.buildDescription(),
      inputSchema: zodToJsonSchema(GetIssuesParamsSchema),
    };
  }

  private static buildDescription(): string {
    return wrapWithSafetyWarning(`
      Получить информацию о задачах в Яндекс.Трекере.

      Параметры:
      - keys: Массив ключей задач (например, ["QUEUE-1", "QUEUE-2"])
      - fields: Опциональный фильтр полей (экономия токенов)
    `);
  }
}
```

**⚠️ Для опасных операций:** Используй `wrapWithSafetyWarning()`

---

### Шаг 4: Tool (реализация)

```typescript
// get-issues.tool.ts
import { BaseTool } from '@mcp-framework/core';

export class GetIssuesTool extends BaseTool<YandexTrackerFacade> {
  static readonly METADATA: ToolMetadata = {
    name: 'get_issues',
    description: '[Issues/Read] Получить задачи по ключам',
    category: 'issues',
    subcategory: 'read',
    priority: 'critical',
    tags: ['issues', 'read', 'get', 'fetch'],
    inputSchema: zodToJsonSchema(GetIssuesParamsSchema),
  };

  getDefinition(): ToolDefinition {
    return GetIssuesDefinition.build();
  }

  async execute(params: unknown): Promise<ToolResponse> {
    // 1. Валидация
    const validated = this.validateParams(GetIssuesParamsSchema, params);

    // 2. Вызов facade
    const results = await this.facade.getIssues(validated.keys);

    // 3. Обработка результатов
    const processed = BatchResultProcessor.process(
      results,
      (item) => ResponseFieldFilter.filter(item, validated.fields)
    );

    // 4. Логирование
    ResultLogger.logBatchSuccess(this.logger, 'get_issues', {
      totalRequested: validated.keys.length,
      successful: processed.successful.length,
      failed: processed.failed.length,
    });

    // 5. Форматирование ответа
    return this.formatSuccess({ issues: processed });
  }
}
```

---

### Шаг 5: Регистрация

**Добавить 1 строку в `src/composition-root/definitions/tool-definitions.ts`:**
```typescript
import { GetIssuesTool } from '../tools/api/issues/get/get-issues.tool.js';

export const TOOL_DEFINITIONS = [
  // ... existing tools
  GetIssuesTool,
];
```

**Автоматическая проверка:**
```bash
npm run validate:tools  # Проверит регистрацию всех *.tool.ts
```

---

## 🔧 Утилиты для Tools

### ResponseFieldFilter

**Назначение:** Фильтрация полей ответа (экономия 80-90% токенов)

```typescript
import { ResponseFieldFilter } from '@mcp-framework/core';

// БЕЗ фильтрации: 10KB данных
const fullIssue = { key, summary, description, ..., assignee: {...}, followers: [...] };

// С фильтрацией: 1KB данных
const filtered = ResponseFieldFilter.filter(fullIssue, ['key', 'summary', 'assignee.login']);
// Результат: { key, summary, assignee: { login } }
```

**⚠️ ВСЕГДА фильтруй перед возвратом!**

---

### BatchResultProcessor

**Назначение:** Обработка `BatchResult<TKey, TValue>` → разделение на successful/failed

```typescript
import { BatchResultProcessor } from '@mcp-framework/core';

const results: BatchResult<string, Issue> = await facade.getIssues(keys);

const processed = BatchResultProcessor.process(
  results,
  (issue) => ResponseFieldFilter.filter(issue, params.fields)
);

// Структура:
// {
//   successful: [{ key: 'QUEUE-1', data: {...} }],
//   failed: [{ key: 'QUEUE-2', error: 'Not found' }]
// }
```

---

### ResultLogger

**Назначение:** Structured JSON логирование результатов

```typescript
import { ResultLogger } from '@mcp-framework/core';

ResultLogger.logBatchSuccess(logger, 'operation_name', {
  totalRequested: 10,
  successful: 8,
  failed: 2,
});
```

---

## 📊 Tool Discovery Modes

### Eager (по умолчанию)

```bash
TOOL_DISCOVERY_MODE=eager  # Все tools при старте
```

**Когда использовать:** Claude Code on the Web, production

---

### Lazy (экспериментальный)

```bash
TOOL_DISCOVERY_MODE=lazy
ESSENTIAL_TOOLS=ping,search_tools
```

**Workflow:**
1. Claude видит только `[ping, search_tools]`
2. Использует `search_tools` для поиска нужного tool
3. Вызывает найденный tool

**Когда использовать:** Claude Desktop, 30+ tools

---

## 📚 Attachments API — Complete Tools Documentation

**5 MCP Tools для работы с вложениями** (production ready ✅)

### Полный список инструментов

| Tool | API Endpoint | Описание | Safety |
|------|-------------|----------|--------|
| `get_attachments` | GET /attachments | Список файлов задачи | Read-only |
| `upload_attachment` | POST /attachments | Загрузка файла | ⚠️ Write |
| `download_attachment` | GET /attachments/{id}/{name} | Скачивание файла | Read-only |
| `delete_attachment` | DELETE /attachments/{id} | Удаление файла | ⚠️ Write |
| `get_thumbnail` | GET /attachments/{id}/thumbnail | Миниатюра изображения | Read-only |

---

### 1. Upload Attachment — Загрузка файлов

**Tool:** `upload_attachment`
**Safety:** `requiresExplicitUserConsent: true` ⚠️

**Два способа загрузки:**

#### Способ 1: Base64 (для MCP clients)
```typescript
// Claude отправляет файл как base64 строку
{
  "issueId": "QUEUE-123",
  "filename": "report.pdf",
  "fileContent": "JVBERi0xLjQKJeLjz9MK...", // base64
  "mimetype": "application/pdf"  // опционально
}
```

#### Способ 2: File Path (для локальных файлов)
```typescript
// Claude читает файл с диска
{
  "issueId": "QUEUE-123",
  "filename": "screenshot.png",
  "filePath": "/tmp/screenshot.png"
}
```

**Лимиты:**
- **Максимальный размер:** 10 MB (по умолчанию)
- **Валидация имени:** Без спецсимволов `../, /, \`
- **MIME type:** Автоопределение если не указан
- **Форматы:** Любые файлы (PDF, PNG, DOCX, etc)

**Пример реализации:**
```typescript
export class UploadAttachmentTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = {
    name: 'fyt_mcp_upload_attachment',
    description: '[Issues/Attachments] Загрузить файл в задачу',
    requiresExplicitUserConsent: true, // ⚠️ Модификация данных
  };

  async execute(params: unknown): Promise<ToolResponse> {
    const { issueId, filename, fileContent, filePath } = params;

    // Поддержка обоих способов
    const buffer = fileContent
      ? Buffer.from(fileContent, 'base64')
      : await readFile(filePath);

    // Валидация через FileUploadUtil
    FileUploadUtil.validateFilename(filename);
    FileUploadUtil.validateFileSize(buffer.length, MAX_SIZE);

    const attachment = await this.facade.uploadAttachment(issueId, {
      filename,
      file: buffer,
    });

    return this.formatSuccess({ issueId, attachment });
  }
}
```

---

### 2. Download Attachment — Скачивание файлов

**Tool:** `download_attachment`
**Safety:** Read-only ✅

**Два режима:**

#### Режим 1: Возврат base64 (default)
```typescript
{
  "issueId": "QUEUE-123",
  "attachmentId": "67890",
  "filename": "report.pdf"
}
// Response: { base64: "JVBERi...", size: 245678, mimetype: "application/pdf" }
```

#### Режим 2: Сохранение в файл
```typescript
{
  "issueId": "QUEUE-123",
  "attachmentId": "67890",
  "filename": "report.pdf",
  "saveToPath": "/tmp/downloaded_report.pdf"
}
// Response: { savedTo: "/tmp/downloaded_report.pdf", size: 245678 }
```

**Особенности:**
- API требует filename в URL (получить из `get_attachments`)
- Автоматическое кодирование filename через `encodeURIComponent()`
- Поддержка больших файлов (streaming через Buffer)

---

### 3. Get Attachments — Список файлов

**Tool:** `get_attachments`
**Safety:** Read-only ✅

```typescript
{
  "issueId": "QUEUE-123"
}
// Response: [
//   { id: "67890", name: "report.pdf", size: 245678, mimetype: "application/pdf" },
//   { id: "67891", name: "photo.jpg", size: 102400, thumbnail: "..." }
// ]
```

**Кеширование:** ✅ Список кешируется, инвалидируется при upload/delete

---

### 4. Delete Attachment — Удаление файла

**Tool:** `delete_attachment`
**Safety:** `requiresExplicitUserConsent: true` ⚠️

```typescript
{
  "issueId": "QUEUE-123",
  "attachmentId": "67890"
}
// Response: { deleted: true, issueId, attachmentId }
```

**Предупреждения:**
- Операция необратима
- Инвалидирует кеш списка файлов
- Требует явного согласия пользователя

---

### 5. Get Thumbnail — Миниатюра изображения

**Tool:** `get_thumbnail`
**Safety:** Read-only ✅

```typescript
{
  "issueId": "QUEUE-123",
  "attachmentId": "67891",
  "filename": "photo.jpg"
}
// Response: { base64: "iVBORw0KG...", mimetype: "image/jpeg" }
```

**Ограничения:**
- ✅ Только изображения (PNG, JPG, GIF)
- ❌ Для документов вернет ошибку
- Проверка через `attachment.thumbnail !== undefined`

---

## 🔧 FileUploadUtil — Утилиты валидации

**Методы:**

```typescript
// Валидация имени файла
FileUploadUtil.validateFilename('report.pdf');  // true
FileUploadUtil.validateFilename('../etc/passwd'); // false

// Валидация размера
FileUploadUtil.validateFileSize(buffer.length, 10_000_000); // true/false

// Форматирование размера
FileUploadUtil.formatFileSize(245678); // "239.92 KB"

// MIME type
FileUploadUtil.getMimeType('report.pdf'); // "application/pdf"

// Multipart FormData
FileUploadUtil.prepareMultipartFormData(buffer, filename);
```

---

## 📊 Integration Tests Coverage

**Все 5 Attachments Tools покрыты integration тестами** (коммит c0f44c8):

```bash
✅ upload_attachment.integration.test.ts
✅ download_attachment.integration.test.ts
✅ get_attachments.integration.test.ts
✅ delete_attachment.integration.test.ts
✅ get_thumbnail.integration.test.ts
```

**Test scenarios:**
- Upload: base64 + file path + валидация
- Download: base64 + save to file
- Get: список + пустой список
- Delete: успех + 404
- Thumbnail: изображение + ошибка для не-изображений

---

## 🔗 См. также

- **Общие утилиты:** [@mcp-framework/core](../../../../../framework/core/src/tools/common/README.md)
- **API Operations:** [../tracker_api/api_operations/README.md](../tracker_api/api_operations/README.md)
- **Dependency Injection:** [../composition-root/README.md](../composition-root/README.md)
- **Yandex Tracker CLAUDE.md:** [../../CLAUDE.md](../../CLAUDE.md)
