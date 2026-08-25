# Сверка маршрутов сервера со справочником API Трекера

Снято: 2026-08-25. Страниц справочника: 152. Маршрутов в документации: 240. Наших вызовов: 86.

## Маршруты, которых нет в документации (3)

Отсутствие страницы само по себе не дефект: часть живых маршрутов не описана.
Каждый пункт требует живой пробы — читающий маршрут проверяется `raw_api_request`,
пишущий безопасно не проверить.

| Метод | Путь | Инструмент |
|---|---|---|
| PATCH | `/v3/queues/probe_queueId` | `fr_yandex_tracker_update_queue` |
| GET | `/v3/queues/probe_queueId/components` | `fr_yandex_tracker_get_components` |
| GET | `/v3/myself/favorites/filters` | `fr_yandex_tracker_get_filters` |

## Ключи тела, не упомянутые на странице своего маршрута (7)

Кандидаты класса D9 (API принимает запрос, ключ игнорирует, инструмент рапортует
об успехе) — но НЕ доказанные дефекты. Ищется вхождение имени в раздел ЗАПРОСА
страницы; справочник Трекера неполон, поэтому отсутствие имени означает «проверь
живьём», а не «параметр не работает». Проверенное живой пробой переносится в
`LIVE_VERIFIED_KEYS`, чтобы не всплывать в каждой следующей сверке.

| Инструмент | Метод и путь | Ключи | Страницы |
|---|---|---|---|
| `fr_yandex_tracker_update_issue` | PATCH `/v3/issues/TEST-1` | assignee | api-ref/issues/patch-issue |
| `fr_yandex_tracker_manage_queue_access` | PATCH `/v3/queues/probe_queueId/permissions` | queue-lead | api-ref/queues/manage-access |
| `fr_yandex_tracker_update_worklog` | PATCH `/v3/issues/TEST-1/worklog/probe_worklogId` | start | api-ref/issues/patch-worklog |
| `fr_yandex_tracker_update_board` | PATCH `/v3/boards/probe_boardId` | orderBy, orderAsc, useRanking, country | api-ref/boards/patch-board |
| `fr_yandex_tracker_create_sprint` | POST `/v3/sprints` | startDateTime, endDateTime, status | api-ref/boards/post-sprint |
| `fr_yandex_tracker_update_sprint` | PATCH `/v3/sprints/probe_sprintId` | startDateTime, endDateTime | api-ref/boards/patch-sprint |
| `fr_yandex_tracker_update_global_field` | PATCH `/v3/fields/probe_fieldId` | options, suggest | api-ref/issues/patch-issue-field-name, api-ref/issues/patch-issue-field-value |

## Ключи тела, не проверенные ни с чем (1)

У маршрута нет страницы справочника — сверять ключи тела не с чем. Это НЕ
«расхождений нет»: для этих инструментов проверка класса D9 не выполнялась вовсе.

- `fr_yandex_tracker_update_queue` — PATCH `/v3/queues/probe_queueId`: name, lead, defaultType, defaultPriority, description

## Расхождения, закрытые живой пробой (3)

Ключа нет на странице маршрута, но API его принимает и сохраняет — неполнота
документации. Перепроверять не нужно; список ведётся в `LIVE_VERIFIED_KEYS`.

- `fr_yandex_tracker_create_queue` — description
- `fr_yandex_tracker_update_board` — filter, query
- `fr_yandex_tracker_update_board_column` — limit

## Разделы справочника с пометкой устаревания (1)

### Проекты (старая версия)

- `api-ref/projects/create-project` — POST /v3/projects/
- `api-ref/projects/delete-project` — DELETE /v3/projects/<id_проекта>
- `api-ref/projects/get-project` — GET /v3/projects/<id_проекта>
- `api-ref/projects/get-project-queues` — GET /v3/projects/<id_проекта>/queues
- `api-ref/projects/get-projects` — GET /v3/projects
- `api-ref/projects/update-project` — PUT /v3/projects/<id_проекта>?version=<номер_версии>


## Пометки устаревания внутри страниц наших маршрутов

### api-ref/boards/get-board

- Блок с информацией о колонках доски Массив объектов useRanking Параметр устарел и не влияет на работу доски Возможность менять порядок задач на доске: true
- — запрещено. Логический estimateBy Параметр устарел и не влияет на работу доски Блок с информацией о поле задачи, которое используется для оценки трудоемкости Объект
- Блок с информацией о поле задачи, которое используется для оценки трудоемкости Объект country Параметр устарел и не влияет на работу доски Блок с информацией о стране Объект

### api-ref/boards/get-boards

- Блок с информацией о колонках доски Массив объектов useRanking Параметр устарел и не влияет на работу доски Возможность менять порядок задач на доске: true
- — запрещено. Логический estimateBy Параметр устарел и не влияет на работу доски Блок с информацией о поле задачи, которое используется для оценки трудоемкости Объект
- Блок с информацией о поле задачи, которое используется для оценки трудоемкости Объект country Параметр устарел и не влияет на работу доски Блок с информацией о стране Объект

### api-ref/boards/get-boards-paginate

- Блок с информацией о колонках доски Массив объектов useRanking Параметр устарел и не влияет на работу доски Возможность менять порядок задач на доске: true
- — запрещено. Логический estimateBy Параметр устарел и не влияет на работу доски Блок с информацией о поле задачи, которое используется для оценки трудоемкости Объект
- Блок с информацией о поле задачи, которое используется для оценки трудоемкости Объект country Параметр устарел и не влияет на работу доски Блок с информацией о стране Объект

### api-ref/boards/patch-board

- Блок с информацией о колонках доски Массив объектов useRanking Параметр устарел и не влияет на работу доски Возможность менять порядок задач на доске: true
- — запрещено. Логический estimateBy Параметр устарел и не влияет на работу доски Блок с информацией о поле задачи, которое используется для оценки трудоемкости Объект
- Блок с информацией о поле задачи, которое используется для оценки трудоемкости Объект country Параметр устарел и не влияет на работу доски Блок с информацией о стране. Объект

### api-ref/boards/post-board

- https://api.tracker.yandex.net/v3/liveBoards/ Ранее для создания доски использовался метод POST /v3/boards/ , он устарел. При обращении к этому методу создается доска с параметрами по умолчанию, а параметры из тела запроса игнорируются. Формат запроса Перед выполнением запроса
- Блок с информацией о колонках доски Массив объектов useRanking Параметр устарел и не влияет на работу доски Возможность менять порядок задач на доске: true
- — запрещено. Логический estimateBy Параметр устарел и не влияет на работу доски Блок с информацией о поле задачи, которое используется для оценки трудоемкости Объект
- Блок с информацией о поле задачи, которое используется для оценки трудоемкости Объект country Параметр устарел и не влияет на работу доски Блок с информацией о стране. Объект
