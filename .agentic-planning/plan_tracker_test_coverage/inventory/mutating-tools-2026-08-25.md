# Инвентарь мутирующих инструментов Трекера — 2026-08-25

Снято заново по коду для этапа живой приёмки (`src/live_scope/`). Прошлые таблицы
использованы только для сверки в конце, не как источник.

**Реестр:** `src/composition-root/definitions/tool-definitions.ts` → `TOOL_CLASSES`,
92 инструмента. `readOnlyHint`/`destructiveHint` — из статических `METADATA` каждого
`*.metadata.ts` (аннотации `annotations.*Hint`). Мутирующих (`readOnlyHint !== true`) — **52**,
из них деструктивных (`destructiveHint: true`) — **14**.

## Таблица 1: мутирующие инструменты

Метод/путь — из `npm run enumerate:requests` (скрипт `scripts/enumerate-outgoing-requests.ts`,
92 инструмента, синтетический образец параметров из Zod-схемы, перехват на
`axios.defaults.adapter`), дополнено чтением `src/tracker_api/api_operations/**` там, где
скрипт видит только одну ветку из нескольких (see раздел «чем получено» ниже). Вердикт рубежа —
результат ручного прогона каждого не-GET запроса через `src/live_scope/scope-rules.ts`
(`decideRequest`, порядок правил сверху вниз, первое совпавшее решает; GET/HEAD/OPTIONS
пропускаются рубежом всегда — `SAFE_METHODS` в `live-scope.guard.ts`).

Обозначения: **Р** = readOnlyHint, **Д** = destructiveHint, **U** = unit-тест
(`tests/tools/**`), **I** = интеграционный тест (`tests/integration/tools/**`).

### A. Задача TEST-* и вложенное в неё (issue-nested)

| Инструмент | Р/Д | Метод и путь | Вердикт рубежа | U | I |
|---|:--:|---|---|:--:|:--:|
| `create_issue` | –/– | `POST /v3/issues` (body.queue); при 409 на unique — доп. `POST /v3/issues/_findByUnique` | правило B: allow если `queue===TEST`, иначе deny «вне песочницы»; `_findByUnique` — правило SEARCH, allow всегда | ✅ `issues/create/create-issue.tool.test.ts` | ✅ `issues/create/create-issue.tool.integration.test.ts` |
| `update_issue` | –/– | `PATCH /v3/issues/{key}?version=N` | правило A → `decideIssueScope`: allow только если задача создана этим прогоном (журнал), иначе deny | ✅ | ✅ |
| `transition_issue` | –/– | `POST /v3/issues/{key}/transitions/{id}/_execute`; затем `GET /v3/issues/{key}` (перечитка) | правило A → `decideIssueScope`; GET — safe method, allow всегда | ✅ | ✅ |
| `add_comment` | –/– | `POST /v3/issues/{key}/comments?isAddToFollowers=…` | правило A → `decideIssueScope` | ✅ | ✅ |
| `edit_comment` | –/– | `PATCH /v3/issues/{key}/comments/{id}` | правило A | ✅ | ✅ |
| `delete_comment` | –/Д | `DELETE /v3/issues/{key}/comments/{id}` | правило A | ✅ | ✅ |
| `add_checklist_item` | –/– | `POST /v3/issues/{key}/checklistItems` | правило A | ✅ | ✅ |
| `update_checklist_item` | –/– | `PATCH /v3/issues/{key}/checklistItems/{id}` | правило A | ✅ | ✅ |
| `delete_checklist_item` | –/Д | `DELETE /v3/issues/{key}/checklistItems/{id}` | правило A | ✅ | ✅ |
| `upload_attachment` | –/– | `POST /v3/issues/{key}/attachments` | правило A | ❌ нет | ✅ |
| `download_attachment` | –/– | `GET /v3/issues/{key}/attachments` (поиск метаданных) + `GET …/attachments/{id}/{filename}` | safe method, allow всегда (локальный побочный эффект — сохранение файла на диск, не мутация API) | ❌ нет | ✅ |
| `delete_attachment` | –/Д | `DELETE /v3/issues/{key}/attachments/{id}` | правило A | ❌ нет | ✅ |
| `get_thumbnail` | –/– | `GET /v3/issues/{key}/attachments` + `GET …/thumbnails/{id}` | safe method, allow всегда (тот же побочный эффект, что у download) | ❌ нет | ✅ |
| `create_link` | –/– | `POST /v3/issues/{key}/links` (body: relationship, issue) | правило A → `decideIssueScope` для `{key}`, затем (nested=`links`, POST) `decideLinkCounterpart`: второй конец связи (`body.issue`) обязан тоже быть задачей этого прогона | ✅ | ✅ |
| `delete_link` | –/Д | `DELETE /v3/issues/{key}/links/{id}` | правило A → только своя сторона (комментарий в коде: удаление обратимо, второй конец не проверяется — осознанно) | ✅ | ✅ |
| `add_worklog` | –/– | `POST /v3/issues/{key}/worklog` | правило A | ✅ | ❌ нет |
| `update_worklog` | –/– | `PATCH /v3/issues/{key}/worklog/{id}` | правило A | ✅ | ❌ нет |
| `delete_worklog` | –/Д | `DELETE /v3/issues/{key}/worklog/{id}` | правило A | ❌ **нет** (есть только `tests/tracker_api/api_operations/worklog/delete-worklog.operation.test.ts` — тест операции, не инструмента) | ❌ нет |

### C. Массовые операции (по явному списку задач)

| Инструмент | Р/Д | Метод и путь | Вердикт рубежа | U | I |
|---|:--:|---|---|:--:|:--:|
| `bulk_update_issues` | –/– | `POST /v3/bulkchange/_update` (body.issues[]) | правило C: allow если список непуст и каждая задача — этого прогона (журнал), иначе deny | ✅ | ❌ нет |
| `bulk_transition_issues` | –/– | `POST /v3/bulkchange/_transition` | правило C, та же проверка списка | ✅ | ❌ нет |
| `bulk_move_issues` | –/– | `POST /v3/bulkchange/_move` (+ body.queue) | правило C + доп. проверка: целевая очередь обязана быть `TEST` | ✅ | ❌ нет |

### A′. Сущности самой очереди (видны только внутри неё)

| Инструмент | Р/Д | Метод и путь | Вердикт рубежа | U | I |
|---|:--:|---|---|:--:|:--:|
| `create_component` | –/– | `POST /v3/queues/{queueId}/components` | allow если `queueId===TEST`, иначе deny | ✅ | ✅ |
| `update_component` | –/– | `PATCH /v3/components/{id}` | allow если компонент создан этим прогоном (журнал по id — принадлежность очереди по id не восстановима), иначе deny | ✅ | ✅ |
| `delete_component` | –/Д | `GET /v3/components/{id}` (invalidation lookup, safe) + `DELETE /v3/components/{id}` | GET — allow всегда; DELETE — как у update_component | ✅ | ✅ |
| `create_queue_local_field` | –/– | `POST /v3/queues/{queueId}/localFields` | allow если `queueId===TEST` | ✅ | ❌ нет |
| `update_queue_local_field` | –/– | `PATCH /v3/queues/{queueId}/localFields/{key}` | allow если `queueId===TEST` **и** поле создано этим прогоном (журнал) | ✅ | ❌ нет |

### D/E. Организация целиком (рубеж отклоняет безусловно)

| Инструмент | Р/Д | Метод и путь | Вердикт рубежа | U | I |
|---|:--:|---|---|:--:|:--:|
| `create_queue` | –/– | `POST /v3/queues/` | deny: «создание и правка очередей меняют организацию» | ✅ | ✅ |
| `update_queue` | –/– | `PATCH /v3/queues/{id}` | deny (то же правило) | ✅ | ✅ |
| `manage_queue_access` | –/– | `PATCH /v3/queues/{id}/permissions` | deny: «доступы очереди определяют, кто её видит» | ✅ | ✅ |
| `create_project` | –/– | `POST /v3/projects` | deny: «проекты принадлежат организации целиком» | ✅ | ✅ |
| `update_project` | –/– | `PATCH /v3/projects/{id}` | deny | ✅ | ✅ |
| `delete_project` | –/Д | `DELETE /v3/projects/{id}` | deny | ✅ | ✅ |
| `create_board` | –/– | `POST /v3/boards` | deny: «доски и их колонки видны за пределами очереди» | ✅ | ✅ |
| `update_board` | –/– | `PATCH /v3/boards/{id}` | deny | ✅ | ✅ |
| `delete_board` | –/Д | `DELETE /v3/boards/{id}` | deny | ✅ | ✅ |
| `create_board_column` | –/– | `POST /v3/boards/{id}/columns/` | deny (тот же паттерн `/v[23]/boards`) | ✅ | ✅ |
| `update_board_column` | –/– | `PATCH /v3/boards/{id}/columns/{colId}` | deny | ✅ | ✅ |
| `delete_board_column` | –/Д | `DELETE /v3/boards/{id}/columns/{colId}` | deny | ✅ | ✅ |
| `create_sprint` | –/– | `POST /v3/sprints` | deny: «спринты принадлежат доске, а доска видна за пределами очереди» | ✅ | ✅ |
| `update_sprint` | –/– | `PATCH /v3/sprints/{id}` | deny | ✅ | ✅ |
| `manage_sprint_lifecycle` | –/Д | `action=start` → `POST /v3/sprints/{id}/_start`; `action=archive` → `POST …/_archive`; `action=delete` → `DELETE /v3/sprints/{id}` | deny для всех трёх (общий паттерн `/v[23]/sprints`); **энумератор захватил только ветку `start`** — `archive`/`delete` восстановлены чтением `manage-sprint-lifecycle.operation.ts` | ✅ | ✅ |
| `create_entity` | –/– | `POST /v3/entities/{type}` (`type` = goal/project/portfolio, в пробе — goal) | deny: «цели и сущности Entity API видны организации, а не очереди» (паттерн `/v3/entities` не зависит от `type`) | ✅ | ✅ |
| `update_entity` | –/– | `PATCH /v3/entities/{type}/{id}?version=N` | deny | ✅ | ✅ |
| `delete_entity` | –/Д | `DELETE /v3/entities/{type}/{id}` | deny | ✅ | ✅ |
| `add_goal_key_result` | –/– | `PATCH /v3/entities/goal/{id}?fields=keyResultItems` | deny (тот же паттерн `/v3/entities`) | ✅ | ✅ |
| `set_goal_key_results` | –/Д | `PATCH /v3/entities/goal/{id}?fields=keyResultItems` | deny | ✅ | ✅ |
| `clear_goal_key_results` | –/Д | `PATCH /v3/entities/goal/{id}?fields=keyResultItems` | deny | ✅ | ✅ |
| `create_filter` | –/– | `POST /v3/filters/` | deny: «сохранённые фильтры видны за пределами очереди» | ✅ | ✅ |
| `update_filter` | –/– | `PATCH /v3/filters/{id}` | deny | ✅ | ✅ |
| `create_global_field` | –/– | `POST /v3/fields` | deny: «глобальные поля действуют во всех очередях организации» | ✅ | ✅ |
| `update_global_field` | –/– | `PATCH /v3/fields/{id}` | deny | ✅ | ✅ |
| `delete_global_field` | –/Д | `DELETE /v3/fields/{id}` | deny | ✅ | ✅ |

**Спорных/неочевидных вердиктов рубежа нет** — все 52 инструмента попадают под одно из явных
правил `SCOPE_RULES` (ни одного «правило не найдено», т.е. fail-closed случай в мутирующем
наборе не встретился). Условные вердикты (allow/deny в зависимости от тела запроса — B, A, C,
A′) отмечены явно; при живом прогоне решает фактическое тело, а не образец из схемы.

## Таблица 2: удаляемость сущностей уровня организации

| Сущность | Удаление в API Трекера | Наш инструмент | Источник |
|---|---|---|---|
| Проект | да, `DELETE /v3/projects/{id}` | `delete_project` есть | `yandex.ru/support/tracker/en/api-ref/projects/delete-project.md` (доступность подтверждена WebFetch 2026-08-25) |
| Доска | да, `DELETE /v3/boards/{id}` | `delete_board` есть | `yandex.ru/support/tracker/en/api-ref/boards/delete-board.md` |
| Колонка доски | да, `DELETE /v3/boards/{id}/columns/{id}` | `delete_board_column` есть | `yandex.ru/support/tracker/en/api-ref/boards/delete-column.md` |
| Спринт | да, `DELETE /v3/sprints/{id}` (документ отдельно от архивации: `archive-sprint.md` vs `delete-sprint.md`) | есть — `manage_sprint_lifecycle` c `action: 'delete'`; отдельного `delete_sprint` нет, что и есть замысел (start/archive/delete объединены — см. docstring `manage-sprint-lifecycle.schema.ts`) | `yandex.ru/support/tracker/en/api-ref/boards/delete-sprint.md` (WebFetch 2026-08-25); путь и метод подтверждены также кодом — `src/tracker_api/api_operations/sprint/manage-sprint-lifecycle.operation.ts:43` |
| Глобальное поле | да, `DELETE /v3/fields/{id}` | `delete_global_field` есть | код: `src/tools/api/fields/delete-global-field.metadata.ts` + пакет 7.2.E/4.1 (`packages/servers/yandex-tracker/CLAUDE.md` §2); отдельную страницу `delete-field.md` в индексе документации найти не удалось (404 на прямой попытке, вне индекса `llms.txt`) — источник по этой строке слабее, чем у остальных |
| Очередь | да, `DELETE /v3/queues/{id}` | **нет.** Ни `DeleteQueueTool`, ни какого-либо `delete_queue`-инструмента в `TOOL_CLASSES` | `yandex.ru/support/tracker/en/api-ref/queues/delete-queue.md` (WebFetch 2026-08-25, метод и путь подтверждены явно) — **пробел покрытия API, не тестов** |
| Сохранённый фильтр | **не задокументировано.** Индекс `llms.txt` перечисляет для Filters только create/update/get — страницы `delete-filter` нет | нет `delete_filter`-инструмента | индекс `yandex.ru/support/tracker/en/llms.txt` (WebFetch 2026-08-25) — отсутствие в индексе доказывает слабее, чем присутствие: не исключено, что страница существует вне индекса |
| Сущность Entity API (goal/project/portfolio) | да, `DELETE /v3/entities/{type}/{id}` | `delete_entity` есть | `yandex.ru/support/tracker/en/llms.txt` → `api-ref/entities/delete-entity.md` |

**Вывод:** единственный содержательный пробел — **удаление очереди**: API документирует
`DELETE /v3/queues/{id}`, submodule (`Queues(Collection)` в `yandex_tracker_client/collections.py`,
наследует общий `Collection.delete()`) тоже не возражает, а инструмента нет ни одного. Это не
дефект живой приёмки (рубеж и так обязан отклонять любую мутацию очередей — правило E), а
дефект состава инструментов: пользователь MCP не может удалить тестовую/лишнюю очередь.

## Чем получено и чего этот способ не видит

1. **`npm run enumerate:requests`** (обход `TOOL_CLASSES`, синтетический образец параметров из
   Zod-схемы, перехват на `axios.defaults.adapter`, ответ-заглушка `200 {}`) — основной источник
   путей и тел запроса. **Не видит:** ветки, зависящие от значения ответа сервера (retry/conflict
   — поймано отдельно у `create_issue`), несколько исходов одного `z.enum('action')` в одном
   инструменте (поймано у `manage_sprint_lifecycle` — образец всегда берёт один вариант enum;
   `manage_queue_access` не пострадал, там оба action бьют в один и тот же `PATCH`-путь); падает
   на 13 read-only инструментах из-за несовместимости синтетического курсора с
   `perPage`/`fetchAll` — все они read-only и в мутирующий набор не попадают, но это показывает
   хрупкость генератора образцов к любой новой валидации схемы.
2. **Чтение `src/tracker_api/api_operations/**`** — использовано точечно, чтобы закрыть найденные
   энумератором пробелы (сноски у `manage_sprint_lifecycle`, `create_issue`, `delete_component`).
   Не читалось сплошным просмотром — не исключены другие непойманные ветки в файлах, где
   энумератор отработал без ошибки (доверие к «отработал — значит, путь один» не проверено).
3. **`find`/`grep` по `tests/tools/**` и `tests/integration/tools/**`** — проверяет только
   *существование* файла с ожидаемым именем. **Не видит:** содержимое теста — файл может
   существовать, но не покрывать конкретную ветку (например, `manage_sprint_lifecycle.tool.test.ts`
   мог проверить только `start`, не `delete`) — это не проверялось построчно ни для одного из 52
   файлов.
4. **`WebFetch`/`WebSearch` по `yandex.ru/support/tracker/**`** (доки Трекера) — источник для
   таблицы 2. Хорошо доказывает *наличие* эндпоинта (страница нашлась, метод и путь названы
   явно), слабо доказывает *отсутствие* (страница не нашлась в поиске/индексе — не то же самое,
   что «эндпоинта нет»; именно поэтому строка про фильтры помечена как более слабое доказательство).
5. **`yandex_tracker_client/` (submodule)** — не источник версии (см. `CLAUDE.md` пакета: версия —
   параметр соединения), но пригоден как слабый сигнал существования ресурса: базовый
   `Collection.delete()`/`update()` есть у всех коллекций одинаково, поэтому наличие класса
   `Queues(Collection)` само по себе **не доказывает** поддержку DELETE сервером — доказательство
   по очередям идёт из документации, submodule здесь только косвенно совместим.

## Расхождения со списком прошлой сессии (`v2-paths-2026-08-24.md`)

- **Разный предмет.** Тот артефакт (пакет A этапа 4.1) перечислял пути **v2→v3** по всем
  10 семействам API (включая read-only), не выделял мутирующие/деструктивные отдельно и не
  сверялся с `scope-rules.ts` (которого на тот момент, по всей видимости, ещё не было в текущем
  виде) и не проверял тестовое покрытие. Прямого пересечения строк «инструмент × вердикт рубежа»
  там нет — сверка ниже идёт по путям и телам, а не построчно.
- **Пути и методы совпадают** там, где оба артефакта их называют: components (`GET+DELETE`),
  worklog (4 маршрута), checklistItems, attachments/thumbnails (включая доп. `GET .../attachments`
  перед скачиванием — то же наблюдение, что и здесь), bulkchange (4 маршрута), fields, projects,
  boards, sprints — расхождений в методе/пути не найдено.
- **`manage-sprint-lifecycle` больше не «внутреннее противоречие версий».** Прошлый артефакт
  зафиксировал смесь путей внутри одного файла как отдельный аргумент за миграцию 4.1; после
  завершения 4.1 (коммит `4f49aa0f`) все три ветки (`_start`, `_archive`, DELETE) уже на v3 —
  расхождение снято миграцией, не ошибка той таблицы.
- **Оговорка про bulkchange `_move`/`_transition`/`_update` под v3** (прошлый артефакт: «доказано
  только по аналогии с v2, не пробой — они пишущие») этой таблицей не переоценивалась: живой
  прогон живой приёмки как раз и должен закрыть её настоящим ответом, а не повторной гипотезой.
- **Новое, чего не было в прошлой таблице:** deny/allow-вердикт рубежа по каждому запросу (её
  предмета тогда не существовало), тестовое покрытие (unit/integration) по каждому мутирующему
  инструменту, таблица удаляемости организационных сущностей и находка про отсутствие
  `delete_queue`.
