# Таблица 4. Покрытие API Яндекс.Трекера MCP-сервером

Дата: 2026-08-14. База: `main` (untracked на момент сборки — см. `git status` в конце файла).

## Чем получено

**⚠️ Submodule устарел, использован свежий снимок upstream.** Submodule `yandex_tracker_client/`
в репозитории закреплён на коммите от **2025-10-15** (`9e1aef9`). Реальный upstream к моменту
сборки этой таблицы (2026-08-14) ушёл на **13 коммитов вперёд**, до состояния от 2026-08-10:
`collections.py` вырос на **+399 строк** (1671 → 2070). Коллега-координатор извлёк свежий снимок
upstream в `tracker-client-fresh/` (read-only, submodule НЕ трогался) — именно он использован как
основной референс A ниже, а не пиненный submodule. Диффом (`diff` двух `collections.py`)
подтверждено: новых API-областей появилось много (отмечены пометкой "новое в 2026-08-10" в
таблице покрытия ниже и в разделе «Заметные пробелы»), удалений/breaking-изменений в дифф не
попало — только добавления методов/классов/полей.

**Источник A — референсный клиент, свежий снимок upstream 2026-08-10**
(`/private/tmp/.../scratchpad/tracker-client-fresh/`, НЕ submodule репозитория):
чтение `yandex_tracker_client/collections.py` (все классы `Collection`, их `path`, `fields`,
`@injected_method`/`@injected_property`), `client.py` (какие коллекции подключены к
`TrackerClient` — это и есть публичная поверхность клиента), `connection.py` (retry/If-Match/
version, decode_response) и `exceptions.py` (структура ошибок, включая новое поле `errorsData`).
Там, где важна именно версия из репозитория (submodule), это указано отдельно.

**Источник B — официальная документация** (`https://yandex.ru/support/tracker/en/...`, `about-api`
редиректит сюда с `yandex.cloud`): полный список страниц вытянут через `llms.txt`
(`https://yandex.ru/support/tracker/en/llms.txt`) — единый индекс всех `api-ref/*` страниц по
категориям. Точечные страницы прочитаны в raw markdown (`.md`-суффикс) для деталей параметров:
`api-ref/issues/patch-issue.md`, `api-ref/issues/add-comment.md`,
`api-ref/bulkchange/bulk-move-issues.md`.

**Источник C — наша реализация**: листинг `src/tracker_api/api_operations/**` (79 файлов),
`grep` по `/v2/\|/v3/` во всех `*.operation.ts` (реальные endpoint'ы, которые мы фактически
дёргаем — надёжнее docstring-комментариев), чтение `src/tools/generated-index.ts` (50
зарегистрированных tools с категориями), точечное чтение схем/DTO/tool.ts для полей, которые
tool реально принимает и пробрасывает в API.

## Чего этот способ не видит

- **Тарифные ограничения.** Часть эндпоинтов (Dashboards, Absences, некоторые Administration-ручки)
  доступны не на всех тарифах/для не всех организаций — не проверено на живом API, разметка "не
  реализовано" не означает "гарантированно доступно, если реализовать".
- **Недокументированные эндпоинты.** Если Трекер имеет internal/undocumented API сверх того, что
  есть в клиенте и в `llms.txt` — они не увидены ни одним источником.
- **Дрейф клиент↔дока (уже с учётом свежего снимка от 2026-08-10).** Даже свежий клиент местами
  расходится с моей выжимкой `llms.txt`: реакции на комментарии, избранные фильтры (`favorite`/
  `get_favorites`), заметки и быстрые фильтры досок (`BoardNotes`/`BoardQuickFilters`), `suggest`
  для досок, поиск по worklog (`/v2/worklog/_search`), формы очереди (`forms`/
  `show_default_creation_form`) и key results (`keyResultItems`) в клиенте ЕСТЬ, но не попали как
  отдельные пункты в мою сводку `llms.txt` (она даёт заголовки страниц по разделам, не гарантирует
  100%-охват — вероятно, часть этих страниц существует в доке, но не была явно перечислена в
  ответе модели на запрос к `llms.txt`). Обратных случаев (метод есть в клиенте, но заведомо нет
  ни в старой, ни в свежей доке) не найдено, кроме `Screens`/`IssueTemplates`/`CommentTemplates`/
  `Translations`/`Departments`/`Workflows`(верхнеуровневых)/`LinkTypes`/`Groups` — эти коллекции
  есть в `collections.py` (в обеих версиях, старой submodule и свежем снимке), но не встретились
  ни в одной секции `llms.txt`; вероятно устарели или относятся к закрытой/legacy части API.
  Помечены в таблице отдельно, статус не проверялся против живого API.
- **Сам референсный клиент тоже может отставать от реального API или содержать неточности**
  (прямое указание координатора, не проверено дополнительно) — там, где клиент и дока расходились
  по конкретному параметру, это отмечено явно в разделе «Дефекты», а не разрешено молчаливым
  выбором одного источника.
- **Поведение на живом API.** Ни один запрос к `api.tracker.yandex.net` не выполнялся (задача
  read-only, без реального токена/организации). Все выводы о параметрах — из статического чтения
  кода и доки, не из наблюдения реальных ответов.
- **Глубина параметров помечена "частично" не исчерпывающе.** Для крупных областей (Issues,
  Bulk) сверены ключевые параметры из доки/клиента; экзотические query-параметры
  (`localized`, `notifyAuthor` на всех ручках подряд, `embed`) не сверялись построчно для
  каждого из 50 tools — см. новый раздел «Дефекты» ниже, где часть таких пропусков подтверждена
  точечно.

## Границы охвата

Таблица покрывает **все** категории верхнего уровня из `llms.txt` (29 областей) плюс отдельные
коллекции клиента без аналога в текущей доке. Раздел «Дефекты» **не** проверяет все 50
инструментов построчно — это отдельная, более дорогая задача (нужен построчный diff параметров
каждого tool против доки); ниже отобраны области с наибольшей ценой ошибки (пагинация уже
проверена и не дала находок — см. ниже, запись/массовые операции дали 5 подтверждённых дефектов).
Непроверенным осталось: Checklists, Links, Attachments, Worklog, Fields, Boards/Sprints,
Components, Queues (кроме access/move), Projects — построчного сравнения параметров не делалось,
только проверка наличия/отсутствия самой операции (раздел покрытия) и структурная проверка
пагинации (общая для всех list-эндпоинтов через единый `TrackerPaginator`).

---

## Таблица покрытия

| Область API | Метод/возможность | Есть у нас | Статус | Чего не хватает (если частично) |
|---|---|---|---|---|
| **Issues (core)** | Create/Get/Update | `create_issue`, `get_issues` (batch), `update_issue` | реализовано | — |
| Issues (core) | Delete issue | — | не реализовано | В доке/клиенте такого метода нет вообще (issue нельзя удалить через API) — не пробел |
| Issues (core) | Move issue to another queue (single) | — (только `bulk_move_issues`) | не реализовано | Одиночный `POST .../_move` отсутствует, есть только bulk-вариант |
| Issues (core) | Clone issue | — | не реализовано | `POST .../_clone` (клиент: `clone_to`) отсутствует |
| Issue Search | `find_issues` (query/filter/keys/queue/filterId) | `find_issues` | реализовано | — |
| Issue Search | Count-only (`_count`) | — | не реализовано | Клиент: `Issues.find(count_only=True)` → `/_count`. У нас нет отдельного счётчика без выгрузки страницы |
| Issue Search | Autocomplete/suggestions при поиске | — | не реализовано | Низкая ценность для агента |
| Issue Search | Scroll (>10000 задач) | — | не реализовано (осознанно, см. комментарий в коде) | Задокументированное ограничение, не случайный пробел |
| Issue Links | Get/Create/Delete link | `get_issue_links`, `create_link`, `delete_link` | реализовано | — |
| Issue Links | Список доступных типов связей (linktypes) | — | не реализовано | Клиент: `LinkTypes` `/linktypes`; агенту приходится угадывать/захардкодить relationship-строки |
| Issue Comments | Add/Get/Edit/Delete | `add_comment`, `get_comments`, `edit_comment`, `delete_comment` | частично | См. «Дефекты»: нет summonees/markupType/isAddToFollowers |
| Issue Comments | Реакция на комментарий (add/remove) | — | не реализовано | Клиент (свежий, `add_reaction`/`remove_reaction` → `POST/DELETE .../comments/{id}/reactions/{reaction}`) + дока, низкая ценность |
| Issue Attachments | List/Upload/Download/Delete/Thumbnail | `get_attachments`, `upload_attachment`, `download_attachment`, `delete_attachment`, `get_thumbnail` | реализовано | — |
| Issue Attachments | Upload temporary file (без привязки к issue) | — | не реализовано | Есть только upload сразу в issue |
| Issue Checklists | Add item/Get/Update item/Delete item | `add_checklist_item`, `get_checklist`, `update_checklist_item`, `delete_checklist_item` | частично | Нет удаления/создания чеклиста целиком (только по одному item) |
| Issue Time Tracking | Add/Get/Update/Delete (issue-scoped) | `add_worklog`, `get_worklogs`, `update_worklog`, `delete_worklog` | реализовано | — |
| Issue Time Tracking | Search worklogs org-wide (cross-issue, `POST /v2/worklog/_search`) | — | не реализовано | Свежий клиент: `Worklog.search(created_by, created_at, start, page, per_page)` — фильтр по автору (login) и диапазону дат `{from,to}`, постраничный (`page*perPage ≤ 10000`); отчёт по времени за период по всей организации, у нас только per-issue |
| Issue Transitions | Get transitions / Execute | `get_issue_transitions`, `transition_issue` | реализовано | — |
| Issue Changelog | Get history | `get_issue_changelog` | реализовано | — |
| Issue Permissions | Get issue permissions | — | не реализовано | Низкая ценность, редкий сценарий |
| Bulk Operations | Move/Update/Transition/Status | `bulk_move_issues`, `bulk_update_issues`, `bulk_transition_issues`, `get_bulk_change_status` | частично | См. «Дефекты»: `bulk_move_issues` без `initialStatus` |
| Fields (global) | Get/Create/Update/Delete field | `get_fields`, `get_field`, `create_field`, `update_field`, `delete_field` | реализовано | — |
| Field Categories | Create/change category | — | не реализовано | Низкая ценность, административная операция |
| Filters (saved) | Create/Get/Edit filter | — | не реализовано | Средняя ценность — команда могла бы переиспользовать сохранённые фильтры вместо повторного набора критериев |
| Filters (saved) | Избранные фильтры (favorite/unfavorite/список избранного) | — | не реализовано | Свежий клиент: `favorite`/`unfavorite` (`POST .../_favorite`, `.../_unfavorite`), `get_favorites` (`GET /myself/favorites/filters`) — не встречено в старом submodule, только в свежем |
| Entities: Goals/Projects/Portfolios (новый Entity API) | Create/Get/Update/Delete/List/Bulk-update/Event history/Import | — | не реализовано | Целая область не реализована — см. «Заметные пробелы». Свежий клиент дополнительно: `Entity` теперь `ImportCollectionMixin` (`_import` эндпоинт на каждую из project/portfolio/goal) |
| Entity Comments/Checklists/Attachments/Links | — | — | не реализовано | Производное от отсутствия Entity API |
| Entity Access | Get/Update extended permissions | — | не реализовано | Свежий клиент: `extended_permissions` (GET)/`update_extended_permissions` (PATCH) на `.../{idx}/extendedPermissions` — новое в 2026-08-10, отсутствовало в старом submodule |
| Entity Checklists | Update item (a не только create/move/delete) | — | не реализовано | Свежий клиент: `EntityChecklistItems.update_item(item_id, data)` — новое, старый submodule такого не имел |
| Entity Specialized: Key Results (Goal OKR) | Get/Add/Set(replace all)/Clear key results | — | не реализовано | Свежий клиент — крупное дополнение: `key_results` (GET, ленивая подгрузка `fields=keyResultItems`), `add_key_result` (append), `set_key_results` (полная замена списка, id перегенерируются), `clear_key_results` (`keyResultItems=null`); обёрнуто в `PATCH .../entities/goal/{id}?fields=keyResultItems` с телом `{fields:{keyResultItems: ...}}`. Полностью отсутствовало в старом submodule (2025-10-15) — это не "давний пробел", а совсем недавно появившаяся в API возможность |
| Entity Specialized: Metrics | — | — | не реализовано | Только в `llms.txt`, деталей в клиенте (ни старом, ни свежем) не нашлось — не сверено |
| Projects (legacy v2 `/v2/projects`) | Create/Get/List/Update/Delete | `create_project`, `get_project`, `get_projects`, `update_project`, `delete_project` | реализовано | Это СТАРАЯ v2-коллекция проектов, отличная от Entity/Project (см. выше) — в доке текущий раздел "Projects" описывает именно список очередей проекта через Entity API; наша реализация покрывает только legacy v2 |
| Queues (core) | Create/Get/List/Update | `create_queue`, `get_queue`, `get_queues`, `update_queue` | реализовано | — |
| Queues (core) | Delete/Restore queue | — | не реализовано | Средняя ценность, но рискованная операция (см. «Сомнительные») |
| Queues (core) | Get required fields for create | `get_queue_fields` | реализовано | — |
| Queues (core) | Queue tags (get/remove) | — | не реализовано | Низкая ценность |
| Queues (core) | Формы очереди (`forms`) + `show_default_creation_form` | — | не реализовано | Свежий клиент: `Queues.forms` (`GET .../forms`) и `show_default_creation_form` — новое в 2026-08-10, отсутствовало в старом submodule; влияет на то, можно ли вообще создать задачу через дефолтную форму в очереди (`createIssueFormShowType`) |
| Queues (access) | Grant access (add/remove role) | `manage_queue_access` | частично | Нет GET user/group permissions (только PATCH на изменение). Свежий клиент дополнительно даёт `update_permissions` (общий PATCH `.../permissions` с произвольным телом) — шире, чем наш узкий add/remove-по-роли |
| Queue Local Fields | CRUD локальных полей очереди | — | не реализовано | Средняя ценность — команды с кастомными полями на уровне очереди не могут читать/менять их схему через MCP. Свежий клиент: `update_field(key, ...)` явно уточняет, что локальное поле очереди адресуется PATCH по короткому `key`, а не по глобальному `self`-ссылке (`/localFields/{id}`) — нюанс, который легко сделать неправильно при будущей реализации |
| Queue Automations | Autoactions (CRUD), Triggers (CRUD), логи | — | не реализовано | Низкая ценность для повседневной работы с задачами, высокая для DevOps-настройки трекера. Свежий клиент добавил `query`-поле у `AutoActions.fields` (TQL-фильтр отдельно от `filter`) — деталь на будущее, если область будет реализовываться |
| Macros | CRUD макросов очереди | — | не реализовано | Низкая ценность |
| Boards (core) | Create/Get/List/Update/Delete | `create_board`, `get_board`, `get_boards`, `update_board`, `delete_board` | реализовано | — |
| Board Columns | CRUD колонок доски | — | не реализовано | Средняя ценность — колонки описывают workflow на доске, полезно для отчётности по канбану |
| Board Sprints | Get/Create/Update/Start/Archive/Delete | `create_sprint`, `get_sprint`, `get_sprints`, `update_sprint` | частично | Нет `delete_sprint`, `start_sprint`, `archive_sprint` — явных lifecycle-операций спринта нет вообще |
| Board Notes | CRUD заметок на колонках доски | — | не реализовано | Свежий клиент: `BoardNotes` (`.../boards/{board}/notes/{columnId}`, по одной заметке на колонку) — новое в 2026-08-10 |
| Board Quick Filters | Add/Update/Delete быстрых фильтров доски | — | не реализовано | Свежий клиент: `BoardQuickFilters` (`.../boards/{board}/quick-filters`, delete — по singular-пути `/quick-filter/{id}`, асимметрия в самом API); новое в 2026-08-10 |
| Boards | Suggest (автодополнение при поиске доски) | — | не реализовано | Свежий клиент: `Boards.suggest(input)` → `GET /boards/_suggest`; новое в 2026-08-10, низкая ценность |
| Dashboards | Create dashboard/widget | — | не реализовано | Низкая ценность для MCP-агента (визуальная сущность) |
| Components | Get/Create/Update/Delete | `get_components`, `create_component`, `update_component`, `delete_component` | реализовано | — |
| Components | Get user/group permissions for component | — | не реализовано | Низкая ценность |
| Administration: Issue Types | List/Create/Edit | — | не реализовано | Средняя ценность — список типов нужен, чтобы валидно заполнить `type` при create/update, сейчас агент должен угадывать ключ |
| Administration: Statuses | List/Create/Edit | — | не реализовано | Средняя ценность, аналогично |
| Administration: Resolutions | List/Create/Edit | — | не реализовано | Средняя ценность — нужны при закрытии задач через transition (`resolution`) |
| Administration: Priorities | List/Create/Edit | — | не реализовано | Средняя ценность, аналогично Issue Types |
| Import | Import issue/files/comments/links/worklog | — | не реализовано | Низкая ценность для MCP-агента (миграционный сценарий) |
| External Applications & Links | List apps / remote links CRUD | — | не реализовано | Низкая ценность |
| Users | Get current/specified/list users (с пагинацией) | — (только косвенно через `ping`→`/v3/myself`) | не реализовано | Средняя-высокая ценность — нельзя резолвить логин/UID исполнителя, искать пользователей по имени |
| Absences | Create/Find/Delete отсутствий | — | не реализовано | Низкая ценность |
| Groups (орг. группы, только в клиенте) | Get group | — | не реализовано | Не встречено в `llms.txt` — вероятно legacy/недокументировано сейчас |
| Screens/IssueTemplates/CommentTemplates/Translations/Departments/Workflows(raw)/LinkTypes (только в клиенте) | — | — | не реализовано | Не встречены в `llms.txt`; статус в текущей API неясен, отдельно не проверялся |
| System / Raw fallback | GET-фолбэк на произвольный путь | `raw_api_request` | реализовано (частично закрывает read-only пробелы выше) | Только GET — не помогает для write-областей (Filters, Entities, Administration create/edit) |

---

## Заметные пробелы

Оценка — с точки зрения команды, работающей через MCP **группами задач**: поиск, эпики/цели,
связи, доски, массовые операции.

### Высокая полезность

- **Entities: Goals/Projects/Portfolios (весь Entity API), включая Key Results.** Команда,
  работающая группами задач, типично группирует их вокруг цели (Goal) или Portfolio-проекта.
  Сейчас через MCP невозможно ни создать/прочитать цель, ни привязать к ней задачи, ни получить
  список задач по Entity. Это крупнейший структурный пробел — без него агент не видит верхний
  уровень иерархии работы. Отдельно стоит **Key Results** (`keyResultItems` — OKR-метрики цели):
  свежий референсный клиент (2026-08-10) даёт для них полноценный API (`key_results`/
  `add_key_result`/`set_key_results`/`clear_key_results`), которого не было ещё год назад — то
  есть это не застарелый, а буквально недавно появившийся в самом Трекере пробел. Для команды,
  отчитывающейся по OKR группами задач, это прямое попадание в сценарий "прогресс по цели через
  задачи, которые к ней привязаны".
- **Users (get/list/find).** Без этого агент не может резолвить "Иван Иванов" → login/uid для
  `assignee`/`summonees`/`manage_queue_access` — а это нужно почти в каждом write-сценарии с
  несколькими задачами (массовое переназначение, упоминания в комментариях).
- **Дефект `add_comment` без `summonees`** (см. «Дефекты» ниже) практически равносилен пробелу:
  агент физически не может упомянуть коллегу в комментарии — частая операция при работе с группой
  задач (эскалация, делегирование).

### Средняя полезность

- **Administration: Issue Types/Statuses/Resolutions/Priorities (списки).** Агент сейчас должен
  угадывать корректные ключи для `type`/`priority`/`status`/`resolution` при `create_issue`/
  `update_issue`/`transition_issue` — ошибки валидации на пустом месте. Особенно чувствительно
  при массовых операциях (`bulk_transition_issues` с `values: {resolution: ...}`).
  `raw_api_request` частично закрывает это (GET-only), но требует от агента знать точный путь.
- **Filters (сохранённые фильтры) + избранные фильтры.** Команды часто держат общий фильтр вроде
  "открытые баги спринта" — сейчас агент обязан каждый раз реконструировать критерии в
  `find_issues` вручную. Избранное (`favorite`/`get_favorites`, новое в свежем клиенте) —
  надстройка над той же потребностью, вторична относительно самих CRUD фильтров.
- **Queue Local Fields.** Команды с доменными кастомными полями (частый случай в enterprise)
  не могут узнать их схему через MCP — обязателен ручной поиск в UI.
- **Board Columns + Sprint lifecycle (start/archive/delete).** Для команд, работающих Scrum/Kanban
  досками группами задач, отсутствие управления колонками и явного старта/архивации спринта
  означает, что MCP не покрывает планирование итерации целиком — только чтение сущностей.
- **Worklog search org-wide (`/v2/worklog/_search`).** Для команды, отчитывающейся по трудозатратам
  за спринт/период по группе задач, отсутствие кросс-issue-поиска по worklog означает, что нужно
  сначала перебрать все задачи (через `find_issues`), а потом дёргать `get_worklogs` на каждую —
  вместо одного запроса с фильтром по автору/дате.

### Низкая полезность

- **Dashboards, Import, External Applications, Absences, Macros, Field Categories, Queue
  Automations (autoactions/triggers), Screens.** Административные/настроечные или
  редко используемые в повседневной работе с задачами области — не первоочередные для
  MCP-агента, ориентированного на операции с группами задач.
- **Delete/Restore queue.** Полезность низкая относительно риска — см. «Сомнительные».
- **Reactions на комментарии, temporary file upload, count-only search, Board Notes/Quick
  Filters/Suggest, формы очереди (`forms`/`show_default_creation_form`).** Точечные удобства
  (часть — новые в свежем клиенте 2026-08-10), не меняющие сценарии работы с группами задач.

---

## Сомнительные и рискованные

- **Delete/Restore queue.** Удаление очереди — необратимая по последствиям операция (уносит все
  задачи очереди из обычного доступа). Даже с `requiresExplicitUserConsent` реализация как MCP
  tool создаёт соблазн у автономного агента вызвать её по ошибочной интерпретации задачи.
  Рекомендация: не реализовывать, оставить только через UI/`raw_api_request` (нет — raw
  GET-only, значит вообще не давать доступа этим путём).
- **Import-эндпоинты (issue/comments/links/worklog import).** Предназначены для миграции данных
  из внешних трекеров с сохранением исторических `createdAt`/`createdBy`. В руках MCP-агента
  риск случайного использования вместо обычного create с искажением истории — низкая польза
  относительно риска.
- **Bulk edit entities / bulk-change с широкими фильтрами.** Если реализовывать Entity API,
  массовое редактирование через `metaEntities`-фильтр (а не явный список id) — типичный источник
  "задело больше, чем думал" при работе автономного агента; стоит закладывать явный
  dry-run/подтверждение на уровне tool, а не копировать семантику 1:1.
- **Queue Automations (создание/правка autoaction/trigger через MCP).** Триггеры могут запускать
  произвольные действия на будущих задачах — ошибка агента здесь имеет отложенный и
  трудно диагностируемый эффект (сработает не сразу, а на следующей подходящей задаче).

---

## Дефекты и неполнота существующих реализаций

Верифицированы точечным чтением кода + сверкой с докой и со свежим снимком референсного клиента
(2026-08-10, см. предупреждение о протухшем submodule выше). Покрытие ограничено (см. «Границы
охвата») — акцент сделан на записи и массовых операциях как области с наибольшей ценой ошибки.
Пагинация list-эндпоинтов проверена структурно (единый `TrackerPaginator`/`CursorCodec`, недавно
отревьюенный — коммит `81462158`) — новых дефектов не найдено, отдельно построчно проверены
`get-comments.operation.ts` и `find-issues.operation.ts` (cursor mid-page truncation, seek-gating
`total`/`totalPages`, replay-хеш тела `_search`) — оба корректны.

| Инструмент/операция | Файл:строка | Что не так | Чем подтверждается | Серьёзность |
|---|---|---|---|---|
| `update_issue` | `src/tools/api/issues/update/update-issue.schema.ts:43-45` (поле `status`), `.../update-issue.dto.ts:23-24`, `.../update-issue.tool.ts:74` (спред в `updateData`) | Параметр `status` принимается схемой и отправляется напрямую в `PATCH /v3/issues/{issueKey}`, но по доке прямое изменение статуса через этот эндпоинт не поддерживается | Дока (`api-ref/issues/patch-issue.md`, дословно): *"You can only change the issue status with the Status transition request."* Для смены статуса в проекте отдельно реализован `transition_issue` — т.е. правильный путь уже есть, но `update_issue.status` его дублирует нерабочим способом | ВЫСОКАЯ — параметр в публичной schema инструмента, но либо молча игнорируется API, либо возвращает ошибку; агент получит либо ложное впечатление успеха, либо непонятную 400/409 там, где ожидал рабочий параметр. Точный failure-mode (silent no-op vs error) не проверен на живом API — это ГИПОТЕЗА, проверяется вызовом `update_issue({status: ...})` на тестовой очереди |
| `update_issue` | `src/tracker_api/api_operations/issue/update/update-issue.operation.ts:39-42` (нет query `version`); `update-issue.dto.ts` (нет поля `version`) | Нет поддержки optimistic locking: PATCH уходит без query-параметра `version`, соответственно нет defence от конкурентных перезаписей | Дока (`api-ref/issues/patch-issue.md`): опциональный query-параметр `version` — *"the issue version. Changes are only made to the current version of the issue"*. Референсный клиент отправляет версию как `If-Match` header при каждом `update()` (`collections.py:186-201`, `connection.py:135-136`) — т.е. concurrency-защита есть и в клиенте (headers), и в текущей API-доке (query-параметр); наш код не делает ни того, ни другого | СРЕДНЯЯ — при параллельной работе нескольких агентов/пользователей над одной задачей более позднее `update_issue` молча перезапишет чужие изменения без конфликта (lost update). Опциональная фича, но её полное отсутствие убирает единственный механизм защиты |
| `add_comment` | `src/tools/api/comments/add/add-comment.schema.ts:21-38` | Schema/DTO/operation пропускают только `{issueId, text, attachmentIds}`; параметры `summonees`, `maillistSummonees`, `markupType`, `isAddToFollowers` нигде не встречаются в коде (`grep` по всему `src/` — 0 совпадений) | Дока (`api-ref/issues/add-comment.md`), дословно список полей: *"summonees (Array) — IDs or usernames of summoned users"*, *"maillistSummonees"*, *"markupType"*, query `isAddToFollowers` (default `true`). Референсный клиент тоже перечисляет `summonees` в `fields` `IssueComments` (`collections.py:916`) | ВЫСОКАЯ — упоминание коллег (`@login`) в комментарии — стандартный сценарий эскалации/делегирования при работе с группой задач, полностью недоступен через MCP; агент физически не может это сделать, а не просто "сделает менее удобно" |
| `bulk_move_issues` | `src/tracker_api/dto/bulk-change/bulk-move-input.dto.ts:23-60` (нет поля `initialStatus`), `src/tools/api/bulk-change/move/bulk-move-issues.schema.ts:22-53` (нет поля), `.../bulk-move-issues.operation.ts:57-72` (не прокидывает, даже если бы было) | Документированный параметр `initialStatus` отсутствует на всех трёх уровнях (schema/DTO/operation) | Дока (`api-ref/bulkchange/bulk-move-issues.md`), дословно: *"initialStatus (Boolean) — Reset the status when moving an issue to a queue with a different workflow: true resets the status; false (default) retains the current status."* Референсный клиент: `BulkChange.move(..., move_to_initial_status=False, ...)` → `initialStatus` в теле (`collections.py:1331-1342`) | СРЕДНЯЯ — при перемещении задач в очередь с другим workflow (частый сценарий реорганизации группы задач между очередями) задача может остаться в статусе, которого нет в новом workflow, и потребовать ручного исправления; воспроизводимо детерминированно, не гипотеза |
| `create_issue` | `src/tracker_api/api_operations/issue/create/create-issue.operation.ts:31-48` (нет генерации `unique`); `HttpClient.post` ретраит `POST` (`packages/framework/infrastructure/src/http/client/axios-http-client.ts:111,144-147` через `retryHandler.executeWithRetry`) на `NETWORK_ERROR/408/429/500/502/503/504` (`exponential-backoff.strategy.ts:43-51`) независимо от идемпотентности метода | `create_issue` не генерирует и не позволяет передать `unique` — при ретрае `POST /v3/issues` (например, из-за `504`/потери соединения — сервер мог успеть создать задачу, а ответ потеряться) есть риск создания дублирующей задачи | Референсный клиент явно защищается от этого: `Issues.create()` при отсутствии `unique` в kwargs сам генерирует `uuid.uuid4().hex` (`collections.py:527-529`) и при `Conflict` на повторном создании с тем же `unique` запрашивает существующую задачу через `_findByUnique` вместо создания новой (`collections.py:506-525`). Наш `CreateIssueDto`/tool такого поля не выставляют и не генерируют | ВЫСОКАЯ — молча продублированная задача — это порча данных, которую сложно обнаружить постфактум (два одинаковых тикета в очереди). Механизм ретраев в проекте активен и не делает исключения для неидемпотентных POST — это подтверждено кодом; частота срабатывания на реальном трафике не измерялась (зависит от сетевых условий), сам путь к дефекту не гипотеза |
| Обработка ошибок API (все write-tools, сквозная инфраструктура) | `packages/framework/infrastructure/src/http/error/error-mapper.ts:62-68` (`mapResponseError` читает только `data['errorMessages']` и `data['errors']`) | Тело ошибки API Трекера при 4xx/5xx может содержать поле `errorsData` (дополнительные структурированные данные ошибки) — оно нигде не читается и не попадает в `ApiErrorClass`, соответственно теряется до того, как дойдёт до агента/лога | Свежий референсный клиент (2026-08-10) явно добавил `errors_data = error.get('errorsData')` в `TrackerServerError.__init__` (`exceptions.py:63,76`) — то есть авторы клиента сочли это поле достаточно значимым, чтобы начать его сохранять отдельно от `errors`/`errorMessages`. У нас `ApiErrorClass` конструируется из `(status, message, errors)` — `errorsData` даже не долетает до конструктора | СРЕДНЯЯ — конкретное содержимое `errorsData` не задокументировано ни в клиенте (просто `dict`, без описания полей), ни в проверенных страницах `api-ref`, поэтому оценить, что именно теряется, нельзя — это ГИПОТЕЗА "теряем полезный контекст ошибки", а не подтверждённый пример конкретно потерянного поля. Сам факт несимметричности (клиент явно завёл поле, мы — нет) — не гипотеза, это прямое сравнение кода |

**Не проверялось (осталось за границей этого прохода):** построчная сверка параметров у
`create_link`, `add_worklog`, `add_checklist_item`, `upload_attachment`, `create_board`,
`create_sprint`, `create_project`, `create_component`, `create_field`, `create_queue`,
`bulk_update_issues`/`bulk_transition_issues` (кроме проверенного `bulk_move_issues`) —
аналогичный риск "молча непринятый параметр" или "нет idempotency-защиты у неидемпотентных POST"
не исключён и там; `create_issue`-паттерн (отсутствие `unique`) стоит перепроверить и для других
`create_*`/`add_*` POST-операций отдельным проходом, если он не разбирался ранее.

---

## git status (на момент сдачи отчёта)

```
?? .agentic-planning/plan_mcp_2026_modernization/
?? MCP_2026_07_28_ANALYSIS.md
```

Оба untracked-объекта — не мои изменения (существовали в рабочем дереве до начала этой задачи;
`table4-tracker-api-coverage.md` — единственный файл, который я создал, он лежит внутри уже
untracked `.agentic-planning/plan_mcp_2026_modernization/inventory/`). Файлов вне
`.agentic-planning/` я не создавал и не менял.
