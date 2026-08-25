# Целевые формы запросов (снято по документации Трекера 2026-08-25)

Источники: `yandex.ru/support/tracker/ru/...` — `api-ref/queues/post-component`,
`concepts/queues/create-queue`, `api-ref/projects/create-project`,
`concepts/issues/create-field`, `api-ref/boards/post-board` (он же `post-board`).
Проверено живым чтением: `GET /v3/workflows` и `GET /v3/fields/categories` доступны
через `raw_api_request` — значит, идентификаторы для тел добываются штатно.

## D1 — компонент

`POST /v3/components` (не `POST /v3/queues/{q}/components` — такого маршрута нет).

| Поле | Обяз. | Смысл |
|---|---|---|
| `name` | да | имя компонента |
| `queue` | да | **ключ очереди в теле**, а не в пути |
| `description`, `lead`, `assignAuto` | нет | как сейчас |

Ответ 201, тело содержит `id`, `name`, `queue`, `version`, `assignAuto`.

## D7 — очередь

`POST /v3/queues/` — форма прежняя плюс **обязательный** `issueTypesConfig`:

```
issueTypesConfig: [ { issueType, workflow, resolutions[] } ]
```

`workflow` — идентификатор из `GET /v3/workflows` (в организации есть и пресеты
`quickStartV2PresetWorkflow`, `developmentPresetWorkflow`, и собственные `W1..W43`).
`resolutions` — ключи из `GET /v3/resolutions` (`fixed`, `wontFix`, ...).
Ограничение, найденное живым прогоном: имя очереди ≤ 40 символов.

## D8 — проект

`POST /v3/projects/`. Поля: `name` (обяз.), `queues` (обяз., **ключ очереди строкой**),
`description`, `lead`, `status` (`DRAFT|IN_PROGRESS|LAUNCHED|POSTPONED`),
`startDate`, `endDate` (`YYYY-MM-DD`). **Параметра `key` нет** — отсюда
`400 key: Incorrect data format`. Нет и `queueIds`/`teamUserIds`.

## D10 — глобальное поле

`POST /v3/fields`. Обязательны `id`, `name: {en, ru}`, `category` (id из
`GET /v3/fields/categories`), `type`. Опциональны `order`, `description`,
`readonly`, `visible`, `hidden`, `container`, `optionsProvider`.
**Ключа `schema` в запросе нет** — `schema` приходит только в ответе.
Форма совпадает с уже работающим `create_queue_local_field`, что и было гипотезой отчёта.

Ключей `options` и `suggest` в перечне документации нет — из тела создания они уходят.
Набор значений задаётся через `optionsProvider`. Развилка закрыта здесь, а не в пакете:
рубеж ограничивает тело белым списком, и разъехавшиеся перечни дали бы отказ рубежа
вместо ошибки API.

## D9 — доска

`POST /v3/boards` **объявлен устаревшим**: создаёт доску с параметрами по умолчанию и
**молча игнорирует тело** — ровно наблюдавшееся поведение. Актуальный маршрут —
`POST /v3/liveBoards/`.

| Поле | Обяз. | Смысл |
|---|---|---|
| `name` | да | имя доски |
| `owner` | нет | логин/uid владельца |
| `boardPermissionsTemplate` | нет | `private` \| `public` (по умолчанию `public`) |
| `backlogAvailable`, `sprintsAvailable` | нет | бэклог и спринты (последнее закрывает семейство спринтов) |
| `columns[]` | нет | `{name, statuses[], limit}` |
| `backlogColumns[]`, `nonParametrizedColumns[]` | нет | `{name, limit}` |
| `autoFilters` | нет | `addFilter.liveFilter.fieldValues` — **здесь задаётся очередь**: `{queue: [{fixed: "TEST"}]}`; `removeFilter` — статусы и таймаут |

Очередь доски больше **не** поле верхнего уровня `queue` и не `filter.query`.

**Адресуемость созданного.** Что доска, созданная через `liveBoards`, читается и
правится по `/v3/boards/{id}`, подтверждено косвенно: `GET /v3/boards` отдаёт доски
организации, заведённые интерфейсом (то есть тем же маршрутом), числовыми `id` —
включая созданные им же «Новая доска» (`59`, `65`, `101`, `102`). Прямое
подтверждение — первым шагом живого прогона на 3.1; не подтвердится — маршруты
чтения, правки и удаления доски меняются отдельным пакетом.

## D11 — колонки доски

Форма запросов верна; дефект в адресации: `id` колонки не уникален внутри доски.
Решение (принято пользователем): при неоднозначной адресации — отказывать.
