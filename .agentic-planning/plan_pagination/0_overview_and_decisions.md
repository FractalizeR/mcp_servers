# План: Полная пагинация для list-эндпоинтов Yandex Tracker MCP

> Статус: ЧЕРНОВИК для архитектурного ревью. Кода в плане нет — только архитектура, контракты, DoD, edge cases, тест-план и АЛЬТЕРНАТИВЫ.

## 1. Проблема (подтверждено по коду)

Все MCP-инструменты, возвращающие коллекции, молча отдают только **первую страницу** данных API Яндекс.Трекера.

**Корневая причина (факт):** `AxiosHttpClient.get/post` возвращают только `response.data` и выбрасывают `response.headers` (`packages/framework/infrastructure/src/http/client/axios-http-client.ts:96-114`). Интерфейс `IHttpClient` не отдаёт заголовки вовсе. Поэтому слой операций физически не видит ни `Link`, ни `X-Total-Count`/`X-Total-Pages`. Как следствие:
- `PaginationUtil.parseFromHeaders()` / `parsePaginatedResponse()` — мёртвый код (нет вызовов вне реэкспорта).
- Любой list-GET отдаёт первую страницу без признака, что есть ещё.

## 2. Два механизма пагинации в Трекере (подтверждено по референсному Python-клиенту)

`yandex_tracker_client/connection.py:234-255` — клиент **дженерик**, реагирует на заголовок `Link`:

| Механизм | Сигнатура ответа | Endpoints | Как идти дальше |
|---|---|---|---|
| **Link `rel="next"`** (cursor) | заголовок `Link: <url>; rel="next"` | GET-коллекции: changelog, comments, worklog, links, attachments, components, checklist, queues, projects | повторить исходный запрос (тот же метод/тело/заголовки) по URL из `next`, пока он есть (`objects.py:268-307`, `_strip_host`) |
| **Seekable** | `Link rel="next"` + `rel="seek"` + заголовки `X-Total-Count`, `X-Total-Pages` | POST `_search` (find issues, entities) | как next, либо прыжок на страницу N через seek-шаблон (`objects.py:310-330`) |

Вывод: «какие endpoints пагинируются» решает сервер, а не клиент. Дженерик-проход по `Link rel="next"` автоматически покрывает все из них и является no-op там, где заголовка нет.

## 3. Цель и принятые пользователем решения

- **Подход:** гибрид — по умолчанию возвращаем одну страницу + метаданные (`hasNextPage`/`total`/...); параметр `fetchAll=true` подтягивает все страницы с защитным лимитом и флагом `truncated`.
- **Охват:** инфраструктура + все list-эндпоинты: changelog, comments, worklog, links, attachments, components, checklist, queues, projects, find_issues.

## 4. Сквозной контракт результата

`PaginatedResult<T> = { items: T[]; pagination: PaginationMeta }`

`PaginationMeta = { page?, perPage?, total?, totalPages?, hasNextPage: boolean, fetchedAll: boolean, truncated: boolean, pagesFetched: number }`

- Single-page и fetchAll используют один тип; различаются флагами `fetchedAll`/`truncated`.
- `total`/`totalPages` заполняются только когда сервер прислал `X-Total-*` (seek); для чистого Link-cursor их может не быть → `hasNextPage` достаточно.

---

## 5. ТОЧКИ АРХИТЕКТУРНЫХ РЕШЕНИЙ И АЛЬТЕРНАТИВЫ (предмет ревью)

### DP-1. Как отдавать заголовки из HTTP-клиента
- **(A) [предпочт.]** Добавить `getWithResponse<T>` / `postWithResponse<T>` → `{ data, headers }`. `get/post` без изменений (обратная совместимость для не-list вызовов). Минимальный blast-radius, явный opt-in.
- (B) Сделать единый `request<T>(cfg): Promise<HttpResponse<T>>` (status+headers+data); `get/post` — тонкие обёртки. Чище в долгую, но трогает базовый контракт.
- (C) Менять `get/post` на возврат `{data, headers}` везде. Огромный blast-radius. **Отклонено.**
- (D) Отдельный pagination-decorator над `IHttpClient`, который сам следует по `next` и отдаёт `getAll<T>()`; операции зовут декоратор. Но ему всё равно нужен доступ к заголовкам → сводится к (A)/(B).

### DP-2. Где живёт логика прохода по страницам
- **(A) [предпочт. под вопросом]** Server-side util в `tracker_api/utils` (Paginator). Tracker-специфика (Link/seek/X-Total) не течёт во фреймворк.
- (B) Generic `LinkHeaderPaginator` во фреймворке (`infrastructure`). DRY для монорепо (wiki/ticktick тоже бьют пагинируемые API). Link — стандарт (RFC 5988), это не доменная логика Трекера.
- **Вопрос ревью:** не лучше ли сразу (B), раз есть ещё два сервера с теми же API Яндекса?

### DP-3. Форма выдачи в batch-инструментах
- **(A) [предпочт.]** Операция возвращает `BatchResult<string, PaginatedResult<Entry>>`. Tool фильтрует `data.items`, прокидывает `data.pagination` рядом с массивом на каждую задачу. `BatchResultProcessor` остаётся дженериком (data = PaginatedResult).
- (B) Расширить `BatchResultProcessor`, чтобы он знал про pagination. Лишняя связанность; отклоняется в пользу (A).

### DP-4. Механика fetchAll и защитный лимит
- Идём по `Link rel="next"` пока есть, ИЛИ пока не упёрлись в лимит → `truncated=true`.
- **Лимит считаем в ЗАПИСЯХ, не в страницах** (записи = прокси токенов агента). Дефолт `maxItems=500`. `maxPages` — только вторичный backstop от рантэвея (напр. 100), не основной рычаг.
- **Обоснование (решение пользователя):** 500 записей достаточно как максимум для одного ответа агента; 5000 (50 страниц × 100) — это десятки тысяч токенов, перебор. Если агенту нужно больше — он листает вручную, постранично, опираясь на `hasNextPage`/`page` из метаданных. Именно ради этого выбран гибридный подход.
- `perPage` в режиме fetchAll можно поднимать к максимуму endpoint'а ради меньшего числа round-trip'ов, но `maxItems` всё равно обрезает выдачу (последнюю страницу усекаем до лимита, `truncated=true`).
- Страницы одного ресурса — строго последовательны (next известен только из предыдущего ответа). Параллелизм между задачами — существующий `ParallelExecutor`.

### DP-5. `_search` (POST) — следовать Link или перебирать page?
- **(A) [предпочт.]** Следовать `Link rel="next"` (как Python: повторный POST на next-URL с тем же телом) — единый механизм с GET.
- (B) Цикл `page=1..X-Total-Pages` через seek. Проще читать total, но дублирует механизм.
- **Out of scope (документируем как ограничение):** scroll API (`scrollType/perScroll/scrollToken`) для >10000 результатов — отдельный механизм, в v1 не реализуем. **Вопрос ревью:** согласны отложить?

### DP-6. Обратная совместимость вывода инструментов
- batch-GET: добавляем поле `pagination` к каждому элементу `successful` — аддитивно, существующий контент (`comments`/`count`) не меняется.
- `find_issues`: сейчас отдаёт массив. Обернуть в `{ items, pagination }` — изменение формы. **Вопрос ревью:** оборачивать или добавить `pagination` соседним полем, сохранив массив на прежнем ключе?

---

## 6. Карта этапов

- **Этап 1 (sequential, общие контракты):** 1.1 инфраструктура (заголовки), 1.2 Paginator, 1.3 общие схемы + batch-метаданные.
- **Этап 2 (parallel, изоляция по файлам):** 2.1 changelog+comments, 2.2 worklog+attachments+links, 2.3 components+checklist, 2.4 queues+projects, 2.5 find_issues.
- **Этап 3 (sequential):** документация, `npm run validate`, расширенное ревью, коммиты (на отдельной ветке).

## 7. Риски
- Mock-клиент в тестах не отдаёт заголовки → нужен апгрейд `MockHttpClient` (часть 1.1), иначе все тесты пагинации нечем покрыть.
- Поведение реального API на разных endpoint'ах не проверено живьём — Link-подход устойчив к этому (no-op без заголовка), но `total` может отсутствовать.
- `depcruise`: вынос generic-примитивов во фреймворк (DP-2) — проверить граф зависимостей.

---

## 8. РЕЗУЛЬТАТЫ АРХИТЕКТУРНОГО РЕВЬЮ (Claude + Codex + DeepSeek) — принятые правки

Ревью прошло тремя независимыми ревьюерами. Ниже — РАЗРЕШЁННЫЕ решения (заменяют «предпочтения» выше) и новые обязательные пункты. Все верифицированы по коду.

### Разрешения по точкам решений
- **DP-1 → A, но через единый приватный `requestWithResponse`.** Публичный контракт `getWithResponse`/`postWithResponse` (аддитивно), но обе реализации идут через один приватный метод с retry-обёрткой — чтобы не дублировать обвязку и не плодить `*WithResponse` (Codex/Claude). `post` сейчас не принимает query-params (`i-http-client.interface.ts:25`) — `postWithResponse` должен принимать опциональные params.
- **DP-2 → SPLIT (2/3 ревьюеров).** В `@fractalizer/mcp-infrastructure` — только generic-примитивы: `HttpResponseEnvelope<T>`, нормализация заголовков (lowercase string-map), `parseLinkHeader` (RFC 5988). Вся доменная политика (X-Total-*, seek, maxItems/maxPerPage, цикл fetchAll, переотправка тела для `_search`, batch-семантика) — в `#tracker_api/utils` (`TrackerPaginator`). Причины: wiki/ticktick делят тот же `IHttpClient`, но у ticktick пагинация иная (`nextPageToken`/offset, не Link) → во фреймворк нельзя зашивать seek/X-Total. depcruise разрешает примитивы в infrastructure (правило `infrastructure-bottom-layer` не нарушено).
- **DP-3 → A (без правок core).** `BatchResultProcessor` остаётся generic, `data = PaginatedResult<T>`. Добавить tracker-side хелпер `paginatedFieldFilter(fields)`, чтобы не дублировать распаковку `{items, pagination}` в 5 инструментах. Тестом подтвердить, что задача с 0 записей не уедет в `failed` (смена типа `Entry[]` → объект).
- **DP-5 → двойная стратегия для `_search` (Codex HIGH, верифицировано).** Следовать `Link rel="next"`, ЕСЛИ есть; иначе, если есть `X-Total-Pages` без `Link` — перебирать `page=1..N`. Иначе одна страница. Чисто Link-подход вернул бы только первую страницу для `filter`/`query` без `Link`. Scroll (>10000) отложен и задокументирован; с `maxItems=500` порог недостижим.
- **DP-6 → НЕ оборачивать `find_issues` (2/3).** Сохранить ключ `issues: [...]` и `count`, добавить `pagination` соседним полем (аддитивно, без слома потребителей; единообразно с batch-инструментами).

### Новые обязательные пункты (добавлены в этапы)
1. **Кеш-аудит (HIGH, верифицировано).** `get-attachments.operation.ts:50` (`list:${issueId}`) и `get-components.operation.ts:41` (`${queueId}/components`) кешируют без пагинационных параметров. Правило: для пагинируемых list-операций либо включать `page/perPage/fetchAll/maxItems` в cache-key, либо не кешировать при заданных пагинационных параметрах. → этап 2, чек-лист на каждую операцию.
2. **MockHttpClient — очередь ответов (HIGH).** `setResponse` хранит один ответ на ключ `METHOD:path`; мульти-страничный обход и `_search` (тот же POST-path, разное тело) не замокать. Нужна FIFO-очередь ответов на ключ + заголовки per-response. → этап 1.1.
3. **Частичный отказ при обходе (HIGH).** Если `requestNext` бросает после сбора страниц 1..N-1 — вернуть частичный результат с `fetchedAll=false` и новым флагом `hasError: boolean` в `PaginationMeta` + warning в лог, а не терять собранное. → этап 1.2, поле в контракте.
4. **`truncated` при любом защитном стопе (MEDIUM).** В псевдокоде 1.2 `truncated=true` ставится только при упоре в `maxItems`; при выходе по `maxPages` с непустым `next` тоже `truncated = Boolean(next)`.
5. **`maxPerPage` в контракте `fetchAllPages` (MEDIUM).** Дефолт ~100; в режиме fetchAll поднимаем `perPage` к нему, но `maxItems` всё равно режет.
6. **Нормализация заголовков (MEDIUM).** Axios отдаёт `AxiosHeaders`/массивы/`undefined` — нормализовать в `Record<string,string>` lowercase. → этап 1.1, тест.
7. **Судьба `PaginationUtil` (MEDIUM).** `pagination.util.ts` и его тесты УДАЛИТЬ; логика поглощается `parseLinkHeader` (infra) + `TrackerPaginator` (tracker). knip подтвердит отсутствие мёртвого кода.
8. **`page` + `fetchAll` (LOW).** Конфликт запрещать через Zod `.refine`, а не молчаливый лог (лог агенту не виден). → этап 1.3.
9. **`stripHost` — guard (LOW, defense-in-depth).** Валидировать, что stripped-путь начинается с `/v2/` или `/v3/`; иначе отбросить `next`. → этап 1.2 edge cases.
10. **Инвентарь эндпоинтов (LOW).** `components` по комментарию в коде (`get-components.operation.ts:12`) API не пагинирует — Link-обход там no-op. Классифицировать: «пагинируется / возможно / нет», чтобы не делать лишнего; метаданные добавляем для единообразия (дёшево).

### Бюджет fetchAll для batch-GET — РЕШЕНО (HIGH)
**Глобальный `maxTotalItems` на весь batch-ответ.** `maxItems=500` остаётся per-issue (лимит одной цепочки пагинации), плюс вводится общий потолок `maxTotalItems` (дефолт **1000**) на сумму записей всего ответа инструмента. Механика:
- Задачи обрабатываются через `ParallelExecutor`; аккумулятор записей — общий на вызов инструмента.
- При достижении `maxTotalItems` оставшиеся задачи отдают только первую страницу (или обрезаются), их `pagination.truncated=true`, `hasNextPage` отражает наличие ещё данных.
- `.describe()` обоих полей чётко поясняет семантику (per-issue vs общий потолок), чтобы агент понимал, почему данные обрезаны и как дозапросить вручную.
- Реализация: счётчик в инструменте/фасаде, прокидывается в `TrackerPaginator` как остаток бюджета на каждую задачу (`min(maxItems, maxTotalItems - collectedSoFar)`). Зафиксировать в этапах 1.3 (схемы/контракт) и 2 (batch-инструменты).
