# Резолюции ревью плана (раунд 1: Claude + Codex + DeepSeek)

Каждое замечание верифицировано. Подтверждённые → правки плана; отклонённые → с обоснованием.

## CONFIRMED — внести в план

### R1 (CRITICAL, Codex) — batch-курсор применяется ко ВСЕМ issueIds
Batch-операции (changelog/comments/links/worklog/checklist) вызывают
`execute(issueId, input)` для каждого issueId с ОДНИМ `input`. Курсор декодируется
в путь конкретной задачи (`/v3/issues/A-1/comments?id=...`) → применение к B-1 даст
404/чужие данные. Подтверждено по `get-comments.operation.ts` (executeMany).
**Фикс:** курсор-режим допустим ТОЛЬКО при `issueIds.length === 1` (refine
`cursorRequiresSingleIssue`). Иначе — ошибка валидации с пояснением «листайте
задачи по одной». fetchAll-режим остаётся batch (он per-issue внутри).

### R2 (CRITICAL/HIGH, все трое) — find_issues replay тела/expand хрупкий
`_search` next = `?page=N` (без тела и часто без expand). Решение №1 «передать
критерии повторно» зависит от добросовестности агента: другие критерии + тот же
курсор → тихо неверная страница. Схема требует ≥1 критерий → cursor-only невалиден.
**Фикс (сохраняет решение пользователя «путь + повтор критериев», добавляет защиту):**
- Курсор `_search` кодирует: next-путь + **хеш канонического тела** (query/filter/
  keys/queue/filterId/order).
- На входе: критерии передаются повторно; операция канонизирует их, считает хеш и
  СВЕРЯЕТ с хешем в курсоре. Несовпадение → explicit error (fail-fast), не тихий мусор.
- `expand` при курсоре передаётся повторно и дописывается к next-пути (в Link его нет).
- refine схемы: при наличии `cursor` критерии остаются обязательными (для replay тела),
  но это уже не «надежда» — хеш валидирует соответствие.

### R3 (CRITICAL/HIGH, Codex+Claude) — decode→undefined: ошибка ИЛИ конец списка (противоречие)
План смешивал два поведения. **Фикс — жёстко развести:**
- ВХОДНОЙ курсор (от агента) не прошёл decode/guard/версию/хеш → ВСЕГДА explicit
  `InvalidCursorError` (валидационная ошибка). НИКОГДА не молчаливый возврат первой
  страницы или «конец списка» (иначе тихая потеря хвоста).
- `stripHost(nextUrl) === undefined` при СБОРКЕ meta (выходной next от сервера) →
  трактуем как конец списка (`hasNextPage=false`, без `nextCursor`). Это другой путь.
- `CursorSchema` отличает «не передан» (optional) от «битый» (decode бросает в операции).

### R4 (HIGH, Codex+Claude) — buildMeta: `encode(stripHost(x))` падает при undefined
**Фикс (точный контракт):** `const path = stripHost(nextUrl);
hasNextPage = Boolean(path) || truncated;
nextCursor = path !== undefined ? CursorCodec.encode(path) : undefined;`
(сначала нормализация, потом условное кодирование).

### R5 (HIGH, Claude) — `export *` барели: этапы 2.x не изолированы, DoD 1.1 «build green» недостижим
Удаление `PageSchema`/`page` в 1.1 ломает компиляцию всех 10 эндпоинтов до конца 2.x;
параллельные группы в отдельных ветках тоже не соберутся (другие эндпоинты ещё на page).
**Фикс — стратегия deprecation:**
- В 1.1 ДОБАВИТЬ `CursorSchema`/`cursor`/`nextCursor`, но НЕ удалять `PageSchema`/
  `page`/`PaginationMeta.page` — пометить `@deprecated`.
- Каждая группа 2.x мигрирует свой эндпоинт на cursor (свои файлы), пакет компилируется
  на всех шагах (page ещё существует для немигрированных).
- Удаление deprecated `page`/`PageSchema`/`noPageFetchAllConflict` — в этапе 3.1
  ПОСЛЕ миграции всех 10 (отдельный коммит «удалить legacy page»).
- DoD 1.1 переформулировать: «пакет собирается; новые символы экспортированы;
  старые помечены deprecated».

### R6 (HIGH, Claude) — `hasSeek` у 10 вызывающих → дублирование/риск
**Фикс:** `singlePage` сам вычисляет `hasSeek` из `response.headers`
(`parseLinkHeader(headers.link).seek !== undefined`) и передаёт в `buildMeta`.
Вызывающим знать про `hasSeek` не нужно. Инвариант seek-gating централизован в paginator.
Аналогично — в `fetchAllPages` (по заголовкам финальной страницы; seek там есть, см. R12).

### R7 (HIGH, Claude+DeepSeek) — верификация worklog/checklist недетерминирована в параллельной группе
**Фикс:** перенести верификацию в этап 1.1 (sequential). Источник истины (по приоритету):
(1) эталонный Python SDK `yandex_tracker_client/` (submodule) — пагинирует ли он
worklog/checklistItems; (2) при возможности — живой тест (задача с >perPage записей).
Результат («пагинируется / нет») зафиксировать в overview ДО этапа 2, чтобы группы
2.2/2.3 получили готовую директиву, а не «верифицируй сам».

### R8 (HIGH, Claude+DeepSeek) — нет теста «total СОХРАНЯЕТСЯ у seekable»
**Фикс:** добавить позитивные тесты (queues+projects): mock с `Link ...; rel="seek"` +
`X-Total-*` → meta содержит `total`/`totalPages` (на первой И последней странице).
Эмпирически подтверждено: queues отдаёт seek+X-Total и на последней странице.

### R9 (MEDIUM, Codex+DeepSeek) — cursor + maxItems/maxTotalItems молча игнорируются
`maxItems`/`maxTotalItems` имеют смысл только при `fetchAll`. **Фикс:** курсор
несовместим и с ними. Единый refine `noCursorWithBulkParams`: `cursor` исключает
`perPage` + `fetchAll` + `maxItems` + `maxTotalItems` (все — параметры первой
выборки/bulk-обхода). Любой из них вместе с `cursor` → ошибка.

### R10 (MEDIUM, Codex) — cache bypass не учитывает cursor (links/attachments/components)
`hasPaginationParams` проверяет page/perPage/fetchAll/maxItems, но не cursor →
курсор-запрос может вернуть кешированную первую страницу. **Фикс:** добавить
`|| input.cursor !== undefined` в условие bypass у links (и у components/attachments,
если у них пагинация сохранится; но они non-paginated — см. R11).

### R11 (MEDIUM, все трое) — контракт непагинируемых решить в 1.1, не «в ревью»
**Фикс (решение):** непагинируемые (`components`, `attachments`; `worklog`/`checklist`
по R7) — БЕЗ блока `pagination` в ответе вовсе (вариант A). Правило для агента:
нет ключа `pagination` ⇒ получены все элементы. Зафиксировать в 1.1, применять
одинаково во всех группах. Tools не должны деструктурировать `result.pagination`
у этих эндпоинтов.

### R12 (MEDIUM, Codex+DeepSeek+Claude) — версия/формат курсора: unknown → explicit error
`decode` неизвестной версии (`c2:`) или битого формата → НЕ silent undefined→«конец»,
а explicit error (часть R3). Зафиксировать в контракте CursorCodec.

### R13 (MEDIUM→адопт, Codex HIGH vs DeepSeek LOW) — кросс-эндпоинт курсор может ТИХО вернуть чужие данные
Разногласие ревьюеров. Верификация: курсор queues (`/v3/queues?page=2`) в инструменте
comments пройдёт guard `/v[23]/`, вернёт 200 с объектами очередей → field-filter выдаст
мусор БЕЗ ошибки (не 404). Это тихие неверные данные, а не безобидный UB.
**Решение (компромисс):** добавить в payload курсора лёгкий тег семейства эндпоинта
(напр. короткий код `chlog`/`cmnt`/`q`/`proj`/`find`); `decode` в операции сверяет тег
с ожидаемым → mismatch → explicit error. Стоимость мала, закрывает тихий класс.

### R14 (LOW, Codex) — перечислить удаляемые ВЫХОДНЫЕ поля
Помимо input `page`: `PaginationMeta.page` уходит; `get-queues.tool`/`get-comments`
отдают top-level `page`/`perPage` в ответе. **Фикс:** в плане 2.x перечислить удаляемые
output-поля по эндпоинтам; в DoD — контракт-тесты ответа + обновление tool-metadata.

## REJECTED — с обоснованием

### X1 (DeepSeek #1/#2, Claude L2) — «последняя страница seekable теряет seek/total» → нужен capture-first-page
**ОТКЛОНЕНО (эмпирически опровергнуто).** curl `queues?page=28` (последняя):
`rels=[first,last,prev,seek]` + `X-Total-Count/Pages` ПРИСУТСТВУЮТ (исчезает только
`next`). seek-gating консистентен на всех страницах. Механизм «захват total с первой
страницы» НЕ нужен. (Остаётся лишь позитивный тест R8.)

### X2 (DeepSeek reviewer-comment) — merge-конфликт в composition-root/definitions
**ОТКЛОНЕНО.** Рефакторинг МОДИФИЦИРУЕТ существующие (уже зарегистрированные) tool/
operation, НЕ добавляет новых компонентов → `tool-definitions.ts`/`operation-definitions.ts`
не меняются. `CursorCodec` — статический util без DI-регистрации. Группы 2.x их не трогают.
(Зафиксировать в 3.1 как явное «definitions не меняются».)

### X3 (Codex #2) — порядок refine при тройном конфликте
**ОТКЛОНЕНО (no-op).** Несколько refine дают несколько сообщений — это корректно и
информативно. После объединения в единый `noCursorWithBulkParams` (R9) вопрос снят.

## Решено пользователем (2026-06-19)
- R2/R13 ПРИНЯТЫ: курсор включает хеш канонического тела (find_issues) и тег
  семейства эндпоинта. Токен чуть сложнее, но закрывает класс «тихо неверные данные».
