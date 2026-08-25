# CLAUDE.md — Yandex Tracker MCP Server

**MCP сервер для интеграции с API Яндекс.Трекера v3**

---

## ⚡ ВАЖНО

**Перед работой с Yandex Tracker пакетом:**
1. 📖 **[Корневой CLAUDE.md](../../../CLAUDE.md)** — общие правила monorepo
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
- **API:** Яндекс.Трекер v3 (целевая версия всюду, кроме `raw_api_request` — см. §2)

---

## 🚨 КРИТИЧЕСКИЕ ПРАВИЛА

### 1. Импорты в monorepo

**✅ Используй npm package names для framework:**
```typescript
import { BaseTool } from '@fractalizer/mcp-core';
import { HttpClient } from '@fractalizer/mcp-infrastructure';
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

**Целевая версия — v3 всюду, где v3 существует.** Решено 2026-08-23; миграция —
`.agentic-planning/plan_tracker_test_coverage/4.1_v3_migration_parallel.md`, завершена 2026-08-24.
Артефакт A этапа (`inventory/v2-paths-2026-08-24.md` в той же папке) подтвердил: v3 существует у
всех десяти затронутых семейств — исключений «v2 без v3-аналога» нет. Нормативный источник версии
— **документация Трекера**, не эта таблица и не `yandex_tracker_client/`: у submodule версия —
параметр соединения (`Connection.__init__(api_version=VERSION_V2)`), поэтому он подтверждает v2
тавтологически и источником истины по версии не является — путь и метод подтверждать им можно.
Новая операция пишется сразу на v3.

| Категория | Версия | Endpoint пример |
|-----------|--------|-----------------|
| Issues Core | v3 | `/v3/issues/{key}` |
| Queues | v3 | `/v3/queues/{id}` |
| Comments | v3 | `/v3/issues/{id}/comments` |
| Links | v3 | `/v3/issues/{id}/links` |
| Transitions | v3 | `/v3/issues/{id}/transitions` |
| Changelog | v3 | `/v3/issues/{id}/changelog` |
| User | v3 | `/v3/myself` |
| Attachments | v3 | `/v3/issues/{id}/attachments` |
| Checklists | v3 | `/v3/issues/{id}/checklistItems` |
| Components | v3 | `GET /v3/queues/{id}/components`, `POST /v3/components` |
| Projects | v3 | `/v3/projects` |
| Worklogs | v3 | `/v3/issues/{id}/worklog` |
| Boards | v3 | `POST /v3/liveBoards/`, чтение/правка/удаление `/v3/boards/{id}` |
| Board columns | v3 | `/v3/boards/{id}/columns/` |
| Sprints | v3 | `/v3/sprints`, lifecycle `/v3/sprints/{id}/_start` |
| Global fields | v3 | `/v3/fields` |
| Entity API | v3 | `/v3/entities/{type}` |
| Filters | v3 | `POST /v3/filters/`, путь чтения не документирован |

**Единственное законное исключение — `raw_api_request`.** Его схема допускает и `/v2/`, и
`/v3/`: версию выбирает вызывающий инструмент, а не наш код, поэтому миграции не подлежит по
смыслу (см. `src/tools/api/raw/raw-api-request.schema.ts`).

✅ **Правильно:**
```typescript
// v3 везде
this.httpClient.get('/v3/issues/PROJ-123');
this.httpClient.get('/v3/myself');
this.httpClient.get('/v3/issues/PROJ-123/attachments');
this.httpClient.post('/v3/issues/PROJ-123/worklog', {...});
```

❌ **Неправильно:**
```typescript
this.httpClient.get('/issues');    // Без версии
this.httpClient.get('/v1/issues'); // Неверная версия
```

⚠️ **Форма ответа v3 на мутациях организационных сущностей (проекты, доски, спринты, глобальные
поля) вживую не наблюдалась** — уверенность держится на существовании маршрута (read-only
оракул), идентичности формы на GET и моке. Проверка — предмет живой приёмки 3.1. Боевая проба
2026-08-23 показала: v2 и v3 отдают одинаковое число элементов и одинаковый набор ключей у досок,
проектов, глобальных полей и спринтов — то есть миграция этих четырёх семейств была сменой
версии в пути, а не переписыванием парсинга. У очередей, worklog, чек-листов, вложений и
компонентов проверено только существование маршрута v3 (оракул), не форма ответа и не число
элементов. Отчёты:
`.agentic-planning/plan_tracker_test_coverage/inventory/live-version-probe-2026-08-23.md`,
`.agentic-planning/plan_tracker_test_coverage/inventory/v2-paths-2026-08-24.md`.

⚠️ **Наши типы когда-то расходились с боевым ответом независимо от версии** (`options`
глобального поля — `boolean`, а не массив опций; `id` досок, колонок досок и спринтов — число, а
было объявлено `string`) — исправлено пакетом B этапа 4.1.

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

**Все batch-операции ОБЯЗАНЫ возвращать** (форма зафиксирована `makeBatchResultSchema`,
`#common/schemas/output.schema.js`; машинно проверяется контрактным тестом
`tool-output-schema-representatives.test.ts` — см. [tests/TESTING_STRATEGY.md](tests/TESTING_STRATEGY.md) §5):
```typescript
{
  total: number,               // общее количество операций
  successful: Array<{
    issueId: string,           // ВСЕГДА присутствует, ВСЕГДА массив (не число)
    ...specificData            // специфичные для операции поля
  }>,
  failed: Array<{
    issueId: string,           // тот же ключ, что и у successful
    error: string | ApiErrorDetails
  }>,
  warnings?: ToolWarning[]     // только когда непусто — см. packages/servers/TESTING_STRATEGY.md §6
}
```
`fieldsReturned` в ответе не бывает — эхо входного параметра `fields` удалено
(`plan_tool_contract_unification`).

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
// Пример в tool (см. get-comments.tool.ts):
const filter = paginatedFieldFilter<EntityWithUnknownFields>(fields);
const processed = BatchResultProcessor.process(batchResult, filter);
const { fieldsWithoutValue } = filter.getReport();

return this.formatSuccess(
  {
    total: issueIds.length,
    successful: processed.successful.map((item) => ({ issueId: item.key, ...item.data })),
    failed: processed.failed.map((item) => ({ issueId: item.key, error: item.error })),
  },
  ResponseFieldFilter.toWarnings(fieldsWithoutValue) // warnings, только когда непусто
);
```

**Компоненты:**
- `ParallelExecutor` — throttling, соблюдение maxConcurrentRequests
- `BatchResultProcessor` — унификация результатов
- Типы: `BatchResult<TKey, TValue>` → `ProcessedBatchResult<TKey, TValue>`

**Примеры:** get-comments.tool.ts, add-comment.tool.ts, get-issues.tool.ts

### 2.2. Пагинация list-эндпоинтов

**Все list-эндпоинты пагинируются единообразно** через `TrackerPaginator`
(`#tracker_api/utils`) + `getWithResponse`/`postWithResponse` (заголовки ответа).

**⚠️ BREAKING CHANGE:** пагинация переведена на единый непрозрачный курсор; параметр
`page` **удалён** из всех 10 list-инструментов.

**Подход (cursor):**
- по умолчанию — одна страница + `pagination`. Для следующей страницы агент передаёт
  `pagination.nextCursor` в параметр `cursor` **того же** инструмента (чёрный ящик,
  кодирует путь+perPage; выводится из `Link rel="next"`).
- `cursor` несовместим с `perPage`/`fetchAll`/`maxItems`/`maxTotalItems`; в batch валиден
  только при одном issueId.
- `total`/`totalPages` отдаются **только** для seekable (queues/projects/find_issues,
  `Link rel="seek"`); у cursor-эндпоинтов (changelog/comments/links/worklog/checklist) их нет.
- `fetchAll=true` — полный обход по `Link rel="next"` с лимитами `maxItems` (500/цепочку)
  и `maxTotalItems` (1000/batch-ответ); обрезка → `pagination.truncated=true`.
- Непагинируемые `components`/`attachments` — без блока `pagination` (все элементы за раз).

**Для нового list-эндпоинта:**
- Operation → `Promise<PaginatedResult<T>>`; передавай `tag` (из `CURSOR_TAGS`) в
  `singlePage`/`fetchAllPages`; ветка `cursor` → `CursorCodec.decode(cursor, tag)` + 1 запрос.
- Schema: подключи общие схемы `#common/schemas` (`CursorSchema`/`FetchAllSchema`/
  `MaxItemsSchema`/`MaxTotalItemsSchema`/`makePerPageSchema`) + `.refine(noCursorWithBulkParams)`
  и (для batch) `.refine(cursorRequiresSingleIssue)`.
- Tool: добавь `pagination` **аддитивно**, прежние ключи не меняй.
- Непагинируемые эндпоинты: операцию вызывай без `tag`, пагин-параметры в схему не добавляй.
- ⚠️ **Cache-key** обязан учитывать пагинационные параметры (или не кешировать при них).

**Детали:** [src/tracker_api/api_operations/README.md](src/tracker_api/api_operations/README.md),
[src/tools/README.md](src/tools/README.md), [src/tracker_api/utils/README.md](src/tracker_api/utils/README.md)

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

**Детали:** См. [../../../ARCHITECTURE.md](../../../ARCHITECTURE.md#schema-to-definition-generator), [packages/framework/core/README.md](../../framework/core/README.md)

### 5. Статические метаданные Tool (категоризация и порядок)

- ✅ ОБЯЗАТЕЛЬНО добавляй `static readonly METADATA: StaticToolMetadata` во все tools
- `category`/`subcategory` — используются `DISABLED_TOOL_GROUPS` (единственный рубильник состава,
  по умолчанию пустой — ничего не отключено; та же policy применяется и к `tools/list`, и к
  `tools/call`; неизвестное имя группы — предупреждение в stderr с перечнем допустимых значений)
- `priority` — определяет место в `tools/list`. Сортировка — контракт: приоритет как первый ключ,
  имя как обязательный tie-breaker; два подряд вызова `tools/list` дают побайтово одинаковый список
- ⚠️ Устаревшие env-переменные прежнего режима discovery удалены целиком (не no-op): если клиент их
  всё ещё выставляет, сервер печатает предупреждение в stderr при старте и продолжает работу с
  полным набором инструментов

### 5.1. Инструментов удаления не заводим (решено 2026-08-25)

Сервер намеренно **не даёт** инструментов удаления очереди, сохранённого фильтра, локального поля
очереди и задачи, хотя API Трекера часть из них поддерживает (`DELETE /v3/queues/{id}`
задокументирован). Причина: цена ошибки агента несимметрична. Удаление очереди или задачи в общей
организации необратимо и уносит чужую работу, а разница между «удали мою тестовую очередь» и
«удали очередь» — одно слово в запросе пользователя.

Следствие, которое надо принимать как есть: остаток живых прогонов по этим сущностям убирается
руками в интерфейсе, и отчёт прогона обязан перечислять созданное поимённо
(`.agentic-planning/plan_tracker_test_coverage/5.2_LIVE_RUN_REPORT_2026-08-25.md`). Асимметрия
«создать можем, удалить нет» — осознанная, а не пробел покрытия API; заводить такой инструмент
можно только по явному запросу пользователя, а не «для симметрии CRUD».

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
- Уровень `warn`, но `lint` несёт бюджет `--max-warnings` — новый warn роняет
  сборку. Детали и текущие бюджеты: корневой CLAUDE.md, «Уровни правил»

**Build hash (MCPB):**
- `manifest.json` — производный артефакт, в git не хранится (`.gitignore`)
- Генерируется из `manifest.template.json` только в `npm run build:mcpb`
  (`packages/servers/scripts/increment-build.ts`), обычный `npm run build` его не трогает
- Формат версии: `{version}+{gitHash}` (например, `1.9.0+a1b2c3d`)

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
- ✅ Длина description: `≤ 120 символов` (было 80 — поднято 2026-08-19, см. ниже)
- ✅ Язык — **русский** для field-level `.describe()` в `*.schema.ts`. Для `description`
  в `METADATA` — русский + **английские ключевые слова** в скобках.
  **Почему смешиваем (правило изменено 2026-08-19):** поиск по инструментам на стороне
  MCP-клиента работает на англоязычном эмбеддинге. Проверено вживую: запрос `issues`
  находил `get_issues` только на 10-м месте из 15 и не попадал в топ-5, а русский запрос
  «Получить задачи» — дословно тогдашнее описание инструмента — не находил вообще ничего.
  Описание из двух русских слов делает инструмент практически ненаходимым, а в 80 символов
  вместе с префиксом категории ничего другого не помещалось. Лимит 120 и английские
  ключевые слова — плата за обнаружимость; медиану длины держим низкой, обогащаем адресно.
  Обоснование в числах: `.agentic-planning/plan_tracker_tool_fixes/3.5_descriptions_table.md`.
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

- [ ] 📖 Прочитай [src/tracker_api/api_operations/README.md](src/tracker_api/api_operations/README.md)
- [ ] Наследуй `BaseOperation`
- [ ] Для batch: используй `ParallelExecutor`, возвращай `BatchResult<T>`
- [ ] **АВТОМАТИЧЕСКАЯ РЕГИСТРАЦИЯ:** Добавь **1 строку** в `src/composition-root/definitions/operation-definitions.ts`
- [ ] Facade метод + тесты
- [ ] `npm run validate`

### Добавление Entity

- [ ] 📖 Прочитай [src/tracker_api/entities/README.md](src/tracker_api/entities/README.md)
- [ ] Создай интерфейс (только known поля)
- [ ] Создай `{Name}WithUnknownFields = WithUnknownFields<{Name}>`
- [ ] Экспорт в `index.ts`

### Добавление DTO

- [ ] 📖 Прочитай [src/tracker_api/dto/README.md](src/tracker_api/dto/README.md)
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

**Подробно:** корневой [ARCHITECTURE.md](../../../ARCHITECTURE.md)

---

## 🔧 Тестирование инструментов (dev interface)

**Быстрая проверка инструментов без перезагрузки MCP-клиента.**

### Команды

```bash
# Список инструментов (92 штуки) с классификацией read/write/local-side-effect
npm run tools:list

# Вызвать один инструмент
npm run tools:call -- 'fr_yandex_tracker_get_issues' '{"issueIds": ["TEST-1"], "fields": ["id"]}'

# Запустить батч вызовов (JSONL файл)
npm run tools:batch -- dev-calls.example.jsonl
```

### Примеры

- **`dev-calls.example.jsonl`** — примеры 3 read-инструментов (ping, find_issues, get_users)
- **Запуск:** `npm run tools:batch -- dev-calls.example.jsonl`

### Write-операции и флаги безопасности

- **Read-инструменты** выполняются без ограничений
- **Write-инструменты** требуют `--dangerously-allow-write` (явное подтверждение)
- **local-side-effect** (скачивание файлов) — неблокирующие, но тоже требуют флага

Пример:
```bash
npm run tools:call -- 'fr_yandex_tracker_create_issue' '@params.json' --dangerously-allow-write
npm run tools:batch -- create-issues.jsonl --dangerously-allow-write
```

### Важно: вызовы идут в боевой API

⚠️ Все вызовы выполняются **в боевом Яндекс.Трекере** под вашим токеном из MCP-клиента.
Read-операции безопасны; write-операции **создают/изменяют реальные данные**.

---

## 🔗 ДОПОЛНИТЕЛЬНО

- **Архитектура monorepo:** [../../../ARCHITECTURE.md](../../../ARCHITECTURE.md)
- **Корневой CLAUDE.md:** [../../../CLAUDE.md](../../../CLAUDE.md)
- **API справка:** `../../yandex_tracker_client/` (Python SDK)

<!-- LIMIT_EXCEPTION: +11 строк (2.75%) для добавления секции Batch Operations Pattern -->
