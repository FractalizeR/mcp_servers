# Перечисления (таблицы для утверждений о множествах)

## Таблица 1. Инструменты, отдающие ошибки batch-элементов в structuredContent

**Чем получено:** glob `packages/servers/*/src/**/*.tool.ts` → фильтр по `BatchResultProcessor` /
`.failed.map(` → чтение соседнего `*.schema.ts` (grep `errors:` и `failed:` + 8 строк).

**Чего способ НЕ видит:** схемы не рядом с tool.ts; поля ошибок, собранные через общий helper без
литерала `error:`; серверы вне `packages/servers`; инструменты с переопределённым `getDefinition()`;
ошибки, попадающие в ответ не через `processedResults.failed`. Проверено дополнительно: helper
`makeBatchErrorItemSchema` найден (единственный, `common/schemas/output.schema.ts:69`), используется
1 раз (get-users) и тоже типизирует `error` как `z.ZodString`.

| # | инструмент | имя поля | тип в схеме | что кладётся в рантайме |
|---|---|---|---|---|
| 1 | comments/add/add-comment | errors | `z.string()` | `item.error` (сырой) |
| 2 | comments/get/get-comments | errors | `z.string()` | `item.error` |
| 3 | comments/edit/edit-comment | failed | `z.string()` | `item.error` |
| 4 | comments/delete/delete-comment | failed | `z.string()` | `item.error` |
| 5 | checklists/add/add-checklist-item | errors | `z.string()` | `result.error` |
| 6 | checklists/update/update-checklist-item | errors | `z.string()` | `result.error` |
| 7 | checklists/delete/delete-checklist-item | errors | `z.string()` | `item.error` |
| 8 | checklists/get/get-checklist | failed | `z.string()` | `item.error` |
| 9 | issues/get/get-issues | errors | `z.string()` | `item.error` |
| 10 | issues/links/create/create-link | errors | `z.string()` | `item.error` |
| 11 | issues/links/delete/delete-link | failed | `z.string()` | `item.error` |
| 12 | issues/links/get/get-issue-links | failed | `z.string()` | `item.error` |
| 13 | issues/changelog/get-issue-changelog | failed | `z.string()` | `item.error` |
| 14 | issues/attachments/get/get-attachments | failed | `z.string()` | `item.error` |
| 15 | users/get-users | errors | `makeBatchErrorItemSchema` → `z.string()` | `item.error` |
| 16 | worklog/add/add-worklog | errors | `z.string()` | `item.error` |
| 17 | worklog/get/get-worklogs | errors | `z.string()` | `item.error` |
| 18 | ticktick tasks/get-tasks | errors | `z.unknown()` | `item.error` (совместимо) |
| 19 | ticktick tasks/batch-create-tasks | errors | `z.string()` | требует проверки источника |

Источник значения: `BatchResultProcessor.process()` (`framework/core/src/utils/batch-result-processor.ts:86-96`)
кладёт `ApiErrorClass.toJSON()` — **объект** `{statusCode, message, errors, retryAfter}` — при любой
ошибке HTTP-слоя; строку только для не-Api `Error` и для «пустого результата».

Вывод: под фикс попадают строки 1–17 и 19 (после проверки); 18 уже совместима.

## Таблица 2. Bulk-инструменты (проверка на тот же дефект)

**Чем получено:** чтение всех 4 схем в `tools/api/bulk-change/*/`.
**Чего не видит:** поведение асинхронной операции на стороне Трекера (проверяется только вживую).

| инструмент | форма ответа | подвержен дефекту №1 |
|---|---|---|
| bulk_update_issues | `{message, operationId, status, ...}` | нет — массива ошибок нет |
| bulk_move_issues | `{message, operationId, status, targetQueue, ...}` | нет |
| bulk_transition_issues | `{message, operationId, status, transition, ...}` | нет |
| get_bulk_change_status | `errors[].errorCode/…` + `errorsCount` | нет — своя форма, не из BatchResultProcessor |

Открытый вопрос для проверки вживую: доходят ли до агента per-issue ошибки асинхронной операции
через `get_bulk_change_status`, или они теряются так же тихо, как в дефекте №3.

## Уточнения по итогам ревью плана (2026-08-19)

**Гипотеза подтверждена вживую**, а не рассуждением. Контрольные вызовы через работающий
MCP-сервер:
- `get_issues(["TEST-15"])` → успех
- `get_issues(["TEST-15","TEST-999999"])` → `Structured content does not match the tool's
  output schema: data/data/errors/0/error must be string`
Клиент называет ровно то поле и ровно ту причину, что предсказывала гипотеза.

**Строка 19 таблицы закрыта статически:** ticktick `batch_create_tasks` дефекту НЕ подвержен —
`ticktick.facade.ts:135` типизирует `failed: {index, error: string}` и собирает значение из
`error.message`, `BatchResultProcessor` в этой цепочке не участвует. Развилка «локальный
аналог или подъём во framework» из пакета 2.1 снята как беспредметная.

**Размещение общего контракта** оставлено в `servers/yandex-tracker/src/common/schemas/`
(не поднято во framework): второго потребителя нет — у wiki batch-массивов ошибок нет вовсе,
ticktick не подвержен. Поднимать при появлении второго потребителя.

**Ложное срабатывание DoD-грепа:** `ticktick/src/tools/ping.schema.ts:26` содержит
`error: z.string().optional()` вне batch-контекста — из проверок исключается.

**`users/get-users`** отдельной правки в 2.1 не требует: `get-users.schema.ts:34` использует
фабрику `makeBatchErrorItemSchema`, переведённую на новый контракт пакетом 1.1.
