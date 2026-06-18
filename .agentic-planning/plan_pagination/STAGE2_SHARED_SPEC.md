# Этап 2 — общий контракт для агентов (пагинация list-эндпоинтов)

Каталог пакета: `packages/servers/yandex-tracker`. Слои: **Operation → Service → Facade → Tool**.
Цель: list-эндпоинты возвращают `PaginatedResult` с метаданными; opt-in `fetchAll` обходит все страницы с защитным лимитом `maxItems`. Этап 1 (инфраструктура, `TrackerPaginator`, общие схемы) ГОТОВ — его файлы НЕ менять.

## ЖЁСТКИЕ ОГРАНИЧЕНИЯ (нарушение ломает параллельную работу)

1. **НЕ редактируй `src/tracker_api/facade/yandex-tracker.facade.ts`** — его сводит оркестратор. В отчёте перечисли, какие методы фасада и на какой возвращаемый тип ему надо обновить.
2. **НЕ редактируй barrel-файлы** `src/tracker_api/dto/index.ts`, `src/tracker_api/entities/index.ts`, `src/tracker_api/facade/services/index.ts`, `src/composition-root/definitions/*`. Новые типы импортируй прямым путём (`#tracker_api/dto/<path>.js`). Существующие доменные dto/entity своего домена менять можно.
3. Трогай ТОЛЬКО файлы своего домена (даны в задаче). Не лезь в чужие операции/сервисы/инструменты/тесты.
4. **ВАЛИДАЦИЯ: только `npx vitest run <свои тест-файлы>`** из каталога пакета. НЕ запускай `tsc`, `npm run build`, `npm run validate`, `npm run lint` — фасад ещё не сведён, type-ошибки в фасаде ОЖИДАЕМЫ и не твоя забота. Тесты инструментов мокают фасад и проходят без реального фасада.
5. Комментарии/текст — на русском. Конвенции проекта: SRP, `import type`, без `any`/`unknown` где можно, `.js`-расширения в импортах.

## КОНТРАКТЫ ЭТАПА 1 (использовать, не менять)

**HTTP** (`@fractalizer/mcp-infrastructure`):
- `httpClient.getWithResponse<T>(path, params?): Promise<HttpResponseEnvelope<T>>`
- `httpClient.postWithResponse<T>(path, data?, params?): Promise<HttpResponseEnvelope<T>>`
- `HttpResponseEnvelope<T> = { data: T; headers: ResponseHeaders }`; `ResponseHeaders = Record<string,string>` (lowercase-ключи).

**Паджинатор** (`#tracker_api/utils`, класс `TrackerPaginator`, константы `DEFAULT_MAX_ITEMS=500`/`DEFAULT_MAX_PER_PAGE=100`):
- `TrackerPaginator.singlePage<T>(resp: HttpResponseEnvelope<T[]>, { page?, perPage? }): PaginatedResult<T>` — режим по умолчанию (одна страница + метаданные из заголовков Link/X-Total-*).
- `TrackerPaginator.fetchAllPages<T>({ firstResponse: HttpResponseEnvelope<T[]>, requestNext: (path:string)=>Promise<HttpResponseEnvelope<T[]>>, maxItems?, maxPages?, page?, perPage?, onError? }): Promise<PaginatedResult<T>>` — полный обход по `Link rel="next"`, дефолты maxItems=500/maxPages=100.

**Типы** (`#tracker_api/entities`): `PaginatedResult<T> = { items: T[]; pagination: PaginationMeta }`; `PaginationMeta = { page?, perPage?, total?, totalPages?, hasNextPage, fetchedAll, truncated, hasError, pagesFetched }`.

**Общие Zod-схемы** (`#common/schemas`): `FetchAllSchema`, `MaxItemsSchema`, `PageSchema`, `makePerPageSchema(max?)`/`PerPageSchema`, предикат `noPageFetchAllConflict` + `PAGINATION_CONFLICT_MESSAGE`.

**Batch-хелпер** (`#tracker_api/utils`): `paginatedFieldFilter<T>(fields): (PaginatedResult<T>) => { items, pagination }`. Применяй в `BatchResultProcessor.process(results, paginatedFieldFilter(fields))`.

## ПАТТЕРНЫ

**Operation (single GET):**
- Построй path с query: `page`; `perPage` — в fetchAll, если не задан, подними к `DEFAULT_MAX_PER_PAGE`; `expand`/прочее как раньше.
- `const first = await this.httpClient.getWithResponse<Entry[]>(path);`
- `return input.fetchAll === true`
  - `? TrackerPaginator.fetchAllPages({ firstResponse: first, requestNext: (p) => this.httpClient.getWithResponse<Entry[]>(p), maxItems: input.maxItems, page: input.page, perPage: effectivePerPage })`
  - `: TrackerPaginator.singlePage(first, { page: input.page, perPage: input.perPage });`
- Тип операции: `Promise<PaginatedResult<Entry>>`.

**Operation (batch executeMany через ParallelExecutor):** каждая задача `fn` возвращает `PaginatedResult<Entry>` (вызов `this.execute(id, input)`). Итог: `Promise<BatchResult<string, PaginatedResult<Entry>>>`.

**Schema:** добавь `fetchAll: FetchAllSchema`, `maxItems: MaxItemsSchema` (+ `perPage: makePerPageSchema(<макс или без>)`, `page: PageSchema`, если не было). На объект навесь `.refine(noPageFetchAllConflict, { message: PAGINATION_CONFLICT_MESSAGE, path: ['page'] })`. Рабочий пример refine + generateDefinitionFromSchema — `find-issues.schema.ts`.

**Tool:**
- Single: получи `PaginatedResult` из фасада; отфильтруй `result.items` через `ResponseFieldFilter.filter`; верни АДДИТИВНО, сохранив прежние ключи, + `pagination: result.pagination`.
- Batch: `const processed = BatchResultProcessor.process(results, paginatedFieldFilter(fields));` затем `successful.map(i => ({ issueId: i.key, <прежний ключ>: i.data.items, count: i.data.items.length, pagination: i.data.pagination }))`. Прежние имена ключей сохрани (регрессия формата) — добавляешь только `pagination`.

**DTO:** в input-DTO своего эндпоинта добавь опциональные `fetchAll?: boolean; maxItems?: number;` (+ perPage/page если не было). Меняй файл DTO, не barrel.

## ТЕСТЫ (обязательно)

`MockHttpClient` из `@fractalizer/mcp-infrastructure`: `setResponse(method, path, data, headers?)`, `setResponseQueue(method, path, [{data, headers?}])` (FIFO), реализует getWithResponse/postWithResponse. Заголовок Link: `{ link: '<https://api.tracker.yandex.net/v3/...?page=2>; rel="next"' }`.

- **Operation:** (a) single-page без Link → `pagination.hasNextPage=false`, `fetchedAll=true`; (b) single-page с Link rel=next → `hasNextPage=true`; (c) fetchAll multipage через `setResponseQueue`; (d) fetchAll truncation по `maxItems`.
- **Tool:** мокай фасад → `PaginatedResult` / `BatchResult<PaginatedResult>`; проверь `pagination` в выдаче + регрессию (прежние ключи на месте). Стиль — у соседнего существующего теста инструмента.
- Прогон: `npx vitest run <свои тесты>` — зелёные.

## ОТЧЁТ В КОНЦЕ (обязательно, верни как текст)

1. Список изменённых/созданных файлов.
2. **ТОЧНЫЕ правки для фасада** `yandex-tracker.facade.ts` (оркестратор применит): метод → новый возвращаемый тип (напр. `getCommentsMany(...) → Promise<BatchResult<string, PaginatedResult<CommentWithUnknownFields>>>`); нужен ли новый импорт `PaginatedResult` и откуда.
3. Результат `vitest run` (passed count).
4. Допущения/проблемы.
