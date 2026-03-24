# CLAUDE.md — Yandex Tracker MCP Server

**MCP сервер для интеграции с API Яндекс.Трекера v3**

---

## ⚡ ВАЖНО

**Перед работой с Yandex Tracker пакетом:**
1. 📖 **[Корневой CLAUDE.md](../../CLAUDE.md)** — общие правила monorepo
2. 📖 **Этот файл** — специфика Yandex Tracker
3. 📖 **[README.md](./README.md)** — описание пакета

---

## 📚 STACK

- **TypeScript** (strict mode, NO `any`/`unknown`/`null`/`undefined` где можно избежать)
- **InversifyJS v7** (DI, Symbol-based tokens, `defaultScope: 'Singleton'`)
- **Zod** (валидация параметров, type inference)
- **Axios** (HTTP client, через @fractalizer/mcp-infrastructure)
- **Pino** + **rotating-file-stream** (production logging с автоматической ротацией)
- **Vitest** (тесты, покрытие ≥80%)
- **dependency-cruiser** (валидация архитектурных правил)
- **MCP SDK** (Model Context Protocol)
- **Tool Search System** (из @fractalizer/mcp-search)
- **API:** Яндекс.Трекер v2/v3 (используются обе официально поддерживаемые версии)

---

## 🚨 КРИТИЧЕСКИЕ ПРАВИЛА

### 1. Импорты в monorepo

**✅ Используй npm package names для framework:**
```typescript
import { BaseTool } from '@fractalizer/mcp-core';
import { HttpClient } from '@fractalizer/mcp-infrastructure';
import { ToolSearchEngine } from '@fractalizer/mcp-search';
```

**✅ Внутренние импорты (внутри yandex-tracker):**
```typescript
// Относительные пути для близких файлов
import { YandexTrackerFacade } from './facade/index.js';

// Или через пути в tsconfig (если настроены)
import { GetIssuesOperation } from '../../api_operations/issue/get/index.js';
```

**❌ НЕ импортируй framework через относительные пути:**
```typescript
import { BaseTool } from '../../../core/src/tools/base/base-tool.js'; // WRONG!
```

### 2. Использование API v2 и v3

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
| Attachments | v2 | `/v2/issues/{id}/attachments` |
| Checklists | v2 | `/v2/issues/{id}/checklistItems` |
| Components | v2 | `/v2/queues/{id}/components` |
| Projects | v2 | `/v2/projects` |
| Worklogs | v2 | `/v2/issues/{id}/worklog` |

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

**Дополнительно:**
- ✅ Batch-операции: `getIssues([keys])`, НЕ `getIssue(key)`
- ✅ Справка: `yandex_tracker_client/` (Python SDK)
- ✅ Batch-результаты: используй типы `BatchResult<T>`, `FulfilledResult<T>`, `RejectedResult`

### 2.1. Batch Operations Pattern

Все read и write операции поддерживают batch режим для работы с множественными задачами.

#### Когда использовать batch

**GET операции:**
- Используй batch, когда нужны данные от >1 задачи
- Параметры (perPage, page, expand) применяются ко ВСЕМ задачам одинаково
- Schema pattern: всегда массив `issueIds: IssueKeysSchema` (минимум 1)

**POST/DELETE операции:**
- Используй batch для массовых модификаций
- Каждая задача может иметь индивидуальные параметры
- Input pattern: массив объектов `[{ issueId, ...params }]`

#### Schema conventions

**GET operations (shared parameters):**
```typescript
// Параметры применяются ко всем задачам
const schema = z.object({
  issueIds: IssueKeysSchema,  // всегда массив, минимум 1
  fields: FieldsSchema,
  perPage: z.number().optional(),  // применяется ко всем
  // ... другие общие параметры
});
```

**POST/DELETE operations (individual parameters):**
```typescript
// Каждая задача имеет свои параметры
const schema = z.object({
  comments: z.array(
    z.object({
      issueId: IssueKeySchema,
      text: z.string(),
      attachmentIds: z.array(z.string()).optional(),
      // ... параметры для конкретной задачи
    })
  ).min(1),
  fields: FieldsSchema
});
```

#### Unified batch result format

**Все batch операции ОБЯЗАНЫ возвращать:**
```typescript
{
  total: number,              // общее количество операций
  successful: Array<{
    issueId: string,          // ВСЕГДА присутствует
    ...specificData           // специфичные для операции поля
  }>,
  failed: Array<{
    issueId: string,          // ВСЕГДА присутствует
    error: string             // ВСЕГДА присутствует
  }>,
  fieldsReturned?: string[]   // только для GET операций
}
```

#### ParallelExecutor usage

**ОБЯЗАТЕЛЬНО использовать ParallelExecutor для соблюдения concurrency limits:**
```typescript
// GET операции (одинаковые параметры)
const operations = issueIds.map(id => ({
  key: id,
  fn: async () => this.httpClient.get(`/v3/issues/${id}/comments`)
}));

return this.parallelExecutor.executeParallel(operations, 'get comments');
```

```typescript
// POST/DELETE операции (индивидуальные параметры)
const operations = items.map(item => ({
  key: item.issueId,
  fn: async () => this.httpClient.post(
    `/v3/issues/${item.issueId}/comments`,
    { text: item.text, attachmentIds: item.attachmentIds }
  )
}));

return this.parallelExecutor.executeParallel(operations, 'add comments');
```

#### Обработка частичных ошибок

**Batch операции ДОЛЖНЫ обрабатывать частичные ошибки:**
- Если некоторые задачи успешны, а некоторые с ошибками → вернуть обе группы
- НЕ выбрасывать исключение, если хотя бы одна задача успешна
- Использовать `BatchResultProcessor.process()` для унифицированной обработки

```typescript
// Пример в tool:
const batchResult = await operation.executeMany(params);
const processed = BatchResultProcessor.process(
  batchResult,
  'issueId',        // ключ для группировки
  params.fields     // поля для возврата
);
return processed;   // { total, successful, failed, fieldsReturned }
```

**Компоненты:**
- `ParallelExecutor` — throttling, соблюдение maxConcurrentRequests
- `BatchResultProcessor` — унификация результатов
- Типы: `BatchResult<TKey, TValue>` → `ProcessedBatchResult<TKey, TValue>`

**Примеры:** get-comments.tool.ts, add-comment.tool.ts, get-issues.tool.ts

### 3. 🔍 Фильтрация полей (обязательно)

**Все MCP tools требуют явного указания возвращаемых полей:**

```typescript
// ✅ Правильно
{
  issueId: 'TEST-1',
  fields: ['id', 'summary', 'status.key']
}

// ❌ Неправильно (вызовет ошибку валидации)
{
  issueId: 'TEST-1'
  // fields отсутствует!
}
```

**Преимущества:**
- Экономия контекста Claude на 80-90%
- Быстрее обработка ответов
- Явное управление возвращаемыми данными

**Реализация в tools:**
- ВСЕГДА фильтруй перед возвратом: `ResponseFieldFilter.filter(data, fields)`
- Schema: `fields: FieldsSchema` (БЕЗ `.optional()`)
- **Детали:** [src/tools/README.md](src/tools/README.md)

### 4. Валидация параметров (Zod)

- ✅ ВСЕГДА используй Zod для валидации параметров tools, НЕ кастомные валидаторы
- ✅ Переиспользуй схемы из `src/mcp/tools/common/schemas/`
- ✅ Type inference: `type Params = z.infer<typeof ParamsSchema>`
- **Примеры:** любой `*.tool.ts` файл

### 4.1. Автогенерация MCP Definition из Schema

**Принцип:** Zod schema = единственный источник истины для MCP definition.

**✅ Новый подход (используй):**
```typescript
export class GetIssuesTool extends BaseTool<typeof GetIssuesSchema> {
  getDefinition(): ToolDefinition {
    return generateDefinitionFromSchema(this.metadata, GetIssuesSchema);
  }
}
```

**❌ Старый подход (НЕ используй):**
- Отдельные `*.definition.ts` файлы — удалены
- Ручная синхронизация schema ↔ definition — источник багов

**Преимущества:**
- ✅ DRY принцип (schema = единственный источник)
- ✅ Невозможен schema-definition mismatch
- ✅ Упрощение создания tools (меньше файлов)

**Детали:** См. [../../ARCHITECTURE.md](../../ARCHITECTURE.md#schema-to-definition-generator), [packages/framework/core/README.md](../../framework/core/README.md)

### 5. Статические метаданные для Tool Search

- ✅ ОБЯЗАТЕЛЬНО добавляй `static readonly METADATA: StaticToolMetadata` во все tools
- ✅ Используется для compile-time индексирования (@fractalizer/mcp-search)
- ✅ Позволяет SearchToolsTool находить tools без загрузки всего кода
- ⚠️ При добавлении нового tool — запусти `npm run build` (автоматически обновит индекс)

### 6. Tool Discovery Mode

**⚠️ ВАЖНО:** По умолчанию используется `eager` режим из-за ограничений Claude Code on the Web.

**Концепция:**
- **Eager режим (по умолчанию):** `tools/list` возвращает ВСЕ инструменты сразу
  - ✅ Совместимо с Claude Code on the Web и другими MCP клиентами
  - ⚠️ Больше токенов при подключении (но работает стабильно)

- **Lazy режим (экспериментальный):** `tools/list` возвращает только essential инструменты
  - ❌ НЕ работает с Claude Code on the Web (клиент блокирует вызовы)
  - ✅ Работает с Claude Desktop и другими клиентами с правильной реализацией MCP
  - ✅ Экономия токенов: 100+ инструментов без перегрузки контекста

**Конфигурация через ENV:**
```bash
# По умолчанию: eager (для совместимости с Claude Code on the Web)
TOOL_DISCOVERY_MODE=eager

# Экспериментально: lazy режим (только для Claude Desktop и совместимых клиентов)
TOOL_DISCOVERY_MODE=lazy
ESSENTIAL_TOOLS=ping,search_tools
```

**Workflow в lazy режиме (только Claude Desktop):**
1. Получает `tools/list` → видит только `[ping, search_tools]`
2. Использует `search_tools` для поиска нужного инструмента
3. Вызывает найденный инструмент

**Когда использовать:**
- ✅ `eager` (по умолчанию): Claude Code on the Web, production
- ⚠️ `lazy`: Claude Desktop, 30+ инструментов, экспериментальный режим

### 6. Логирование (Pino)

- ✅ Используй **Pino** с structured logging, НЕ `console.log`
- ✅ Dual output: error/warn → stderr + файл, info/debug → файл
- ✅ Автоматическая ротация логов (`.gz` архивы)
- ⚠️ MCP stdio: stdout для JSON-RPC, stderr для логов

### 7. Тестирование

- Unit тесты: `tests/` (зеркалируют `src/`), покрытие ≥80%
- Vitest с ESM и TypeScript, импорты с `.js` расширениями
- **Баг + тест:** При исправлении бага обязательно добавь тест
- **Детали:** [tests/README.md](tests/README.md)

### 8. Dependency Injection (InversifyJS)

- Symbol-based tokens (`TYPES.*`), НЕ bind по классу
- `toDynamicValue()`, НЕ декораторы `@injectable()`
- `defaultScope: 'Singleton'` (убирает `.inSingletonScope()`)
- **Детали:** [src/composition-root/README.md](src/composition-root/README.md)

### 9. Single Responsibility Principle (SRP)

- Один класс = один файл = одна ответственность
- Tool: `src/mcp/tools/{api|helpers}/{feature}/{action}/{name}.tool.ts`
- Operation: `src/api_operations/{feature}/{action}/{name}.operation.ts`
- ❌ НЕ объединяй логику разных операций в один файл

### 10. Автоматическая проверка регистрации

- `npm run validate:tools` проверяет регистрацию всех `*.tool.ts` и `*.operation.ts`
- Предотвращает забывчивость при добавлении компонентов
- Автоматически запускается в `npm run validate`

### 11. Инструменты качества кода

**Мёртвый код и зависимости (Knip):**
- `npm run knip` — поиск неиспользуемых файлов, exports, npm-пакетов
- Конфигурация: `knip.json`, автоматически запускается в `npm run validate`

**Безопасность зависимостей (Socket.dev):**
- `npm run audit:socket` — анализ supply-chain атак, вредоносных пакетов
- Автоматически в `npm run validate`, severity: high

**Поиск секретов (Gitleaks):**
- `npm run audit:secrets` — сканирование токенов, паролей в коде
- Конфигурация: `.gitleaks.toml`
- **Pre-commit hook:** автоматически проверяет staged файлы

**Lockfile синхронизация:**
- `npm run audit:lockfile` — проверка актуальности package-lock.json
- Автоматически в `npm run validate`

**Code complexity:**
- ESLint правила: `max-params` (≤5), `complexity` (≤15), `max-depth` (≤5)
- Режим `warn` — не блокирует build, но предупреждает

**Build Number:**
- Автоматически инкрементируется при каждой сборке бандла (`npm run build`)
- Хранится в `manifest.json` → `_meta.build.number`
- Помогает избежать кеширования при обновлениях
- Формат версии: `{version}+{buildNumber}` (например, `0.1.0+42`)

---

## 📖 КОНВЕНЦИИ ПО КОМПОНЕНТАМ

**ОБЯЗАТЕЛЬНО прочитай перед работой с компонентом:**

- **MCP Tools** — [src/tools/README.md](src/tools/README.md)
- **API Operations** — [src/tracker_api/api_operations/README.md](src/tracker_api/api_operations/README.md)
- **Entities** — [src/tracker_api/entities/README.md](src/tracker_api/entities/README.md)
- **DTO** — [src/tracker_api/dto/README.md](src/tracker_api/dto/README.md)
- **Dependency Injection** — [src/composition-root/README.md](src/composition-root/README.md)
- **CLI** — [src/cli/README.md](src/cli/README.md)
- **Тестирование** — [tests/README.md](tests/README.md)

### CLI для подключения к MCP клиентам

- ✅ Использует `@fractalizer/mcp-cli` для универсального управления подключениями
- ✅ YT-специфичная конфигурация в `src/cli/types.ts` и `src/cli/prompts.ts`
- ✅ Feature flags для миграции (USE_FRAMEWORK_CLI, DEBUG_CLI_MIGRATION)
- 📖 Детали архитектуры: [packages/framework/cli/README.md](../../framework/cli/README.md)
- 📖 Адаптер YT: [src/cli/README.md](src/cli/README.md)

---

## 📋 КРАТКИЕ ЧЕК-ЛИСТЫ

**⚠️ Подробные чек-листы — в README.md файлах модулей выше**

### Добавление MCP Tool

- [ ] 📖 Прочитай [src/tools/README.md](src/tools/README.md)
- [ ] Создай структуру: `{feature}/{action}/{name}.schema.ts`, `.tool.ts`, `index.ts`
  - ⚠️ **НЕ создавай** `.definition.ts` — definition генерируется автоматически из schema!
- [ ] В `*.schema.ts`:
  - [ ] Используй `.describe()` для каждого поля (используется при автогенерации)
  - [ ] Schema = единственный источник истины для MCP definition
- [ ] Добавь `static readonly METADATA`:
  - [ ] ⚠️ Если tool ИЗМЕНЯЕТ данные → `requiresExplicitUserConsent: true`
  - [ ] ✅ Если tool только ЧИТАЕТ → НЕ добавляй флаг (или `false`)
- [ ] В `getDefinition()`:
  - [ ] Используй `generateDefinitionFromSchema(this.metadata, YourSchema)` — автогенерация
  - [ ] ❌ НЕ создавай отдельный `.definition.ts` файл (устарело)
- [ ] Используй утилиты: `validateParams()`, `BatchResultProcessor`, `ResultLogger`, `ResponseFieldFilter`
- [ ] **АВТОМАТИЧЕСКАЯ РЕГИСТРАЦИЯ:** Добавь **1 строку** в `src/composition-root/definitions/tool-definitions.ts`
- [ ] Тесты + `npm run validate` (автоматически проверит флаг)

#### Метаданные инструментов (обязательно)

**При создании нового tool:**
- ✅ Указать `category` (обязательно): `'issues'`, `'helpers'`, `'system'`, etc.
- ✅ Указать `subcategory` (опционально): `'read'`, `'write'`, `'workflow'`
- ✅ Указать `priority` на основе частоты использования:
  - `'critical'` — часто используемые операции (create, find, get)
  - `'high'` — важные, но не критичные (transitions, changelog)
  - `'normal'` — обычные операции (helpers, utilities) — default
  - `'low'` — редко используемые (demo, debug)
- ✅ Формат `description`: `[Category/Subcategory] Краткое описание`
- ✅ Длина description: `≤ 80 символов`
- ✅ Добавить `tags` для поиска (3-5 тегов): `['read', 'query', 'filter']`

**Примеры:**
```typescript
static readonly METADATA = {
  name: 'create_issue',
  description: '[Issues/Write] Создать новую задачу',
  category: 'issues',
  subcategory: 'write',
  priority: 'critical',
  tags: ['create', 'new', 'write', 'issue'],
  inputSchema: { ... }
};
```

**Зачем:** Priority-based сортировка оптимизирует контекст LLM (важные tools первыми)
**Детали:** [src/tools/README.md](src/tools/README.md#категоризация-инструментов)

### Добавление Operation

- [ ] 📖 Прочитай [src/api_operations/README.md](src/api_operations/README.md)
- [ ] Наследуй `BaseOperation`
- [ ] Для batch: используй `ParallelExecutor`, возвращай `BatchResult<T>`
- [ ] **АВТОМАТИЧЕСКАЯ РЕГИСТРАЦИЯ:** Добавь **1 строку** в `src/composition-root/definitions/operation-definitions.ts`
- [ ] Facade метод + тесты
- [ ] `npm run validate`

### Добавление Entity

- [ ] 📖 Прочитай [src/entities/README.md](src/entities/README.md)
- [ ] Создай интерфейс (только known поля)
- [ ] Создай `{Name}WithUnknownFields = WithUnknownFields<{Name}>`
- [ ] Экспорт в `index.ts`

### Добавление DTO

- [ ] 📖 Прочитай [src/dto/README.md](src/dto/README.md)
- [ ] Создай Input DTO (с `[key: string]: unknown` если нужно)
- [ ] Для update — все поля опциональны
- [ ] Экспорт в `index.ts`

### Перед коммитом

- [ ] `npm run validate` — без ошибок (если только документация, можно не запускать)
- [ ] Все TODO в коде закрыты
- [ ] CLAUDE.md и ARCHITECTURE.md актуальны (если изменили)
- [ ] ⚠️ НЕ форматируй код вручную — pre-commit hook сделает автоматически

---

## 📁 СТРУКТУРА ПАКЕТА

```
packages/servers/yandex-tracker/
├── src/
│   ├── composition-root/    # DI контейнер (см. README.md)
│   ├── api_operations/      # Operations, Facade
│   ├── entities/            # Domain entities
│   ├── dto/                 # Data Transfer Objects
│   ├── mcp/                 # Tools, Utils
│   ├── constants.ts         # App constants
│   └── index.ts             # Entry point
├── tests/                   # Зеркалирует src/
├── scripts/                 # Валидация, smoke test
├── CLAUDE.md                # Этот файл
└── README.md                # Описание пакета
```

**Подробно:** корневой [ARCHITECTURE.md](../../ARCHITECTURE.md)

---

## 🔗 ДОПОЛНИТЕЛЬНО

- **Архитектура monorepo:** [../../ARCHITECTURE.md](../../ARCHITECTURE.md)
- **Корневой CLAUDE.md:** [../../CLAUDE.md](../../CLAUDE.md)
- **API справка:** `../../yandex_tracker_client/` (Python SDK)

<!-- LIMIT_EXCEPTION: +11 строк (2.75%) для добавления секции Batch Operations Pattern -->
