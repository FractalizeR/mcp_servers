# Инвентарь покрытия инструментов Трекера (снят 2026-08-20, релиз 3.1.0)

**Чем получено:** `src/tools/**/*.metadata.ts` — имя (`buildToolName`), категория,
`readOnlyHint`/`destructiveHint`; наличие теста — по базовому имени файла инструмента
среди `tests/**/*.tool.test.ts` (unit) и `tests/integration/**/*.tool.integration.test.ts`;
метод и путь — прогон `npm run enumerate:requests` (реальный контейнер, перехват на
`axios.defaults.adapter`). Число инструментов сверено с реестром: `TOOL_CLASSES` = 92.

**Как читать колонки:** W — аннотация `readOnlyHint` не `true`, а НЕ наблюдённый метод запроса:
`download_attachment` и `get_thumbnail` помечены W, но их наблюдаемый запрос — `GET`.
D — `destructiveHint: true`. unit — тест уровня инструмента (`*.tool.test.ts`); тест уровня
операции (`tests/tracker_api/api_operations/**`) в этой колонке не учитывается и есть у всех пяти
инструментов, помеченных «нет».

**Чего способ НЕ видит:** тест, покрывающий инструмент под другим именем файла или списком
внутри одного файла; покрытие через workflow- и smoke-сценарии (`tests/workflows`,
`tests/smoke` — они покрывают весь реестр разом и в колонках ниже не отражены); путь,
зависящий от значений в ответе сервера; путь инструмента, чей синтетический образец
параметров не прошёл валидацию (14 таких — колонка «Запрос» пуста, это слепое пятно
перечисления, а не свойство инструмента).

**Суммы:** инструментов 92; мутирующих (`readOnlyHint` не `true`) 52; 
деструктивных 14; без unit-теста 5; 
без интеграционного теста 59, из них мутирующих 
31, деструктивных 9.

| Инструмент | Категория (папка) | W | D | unit | integration | Запрос |
|---|---|:--:|:--:|:--:|:--:|---|
| `get_issue_types` | api/administration |  |  | да | **нет** | `GET /v3/issuetypes` |
| `get_priorities` | api/administration |  |  | да | **нет** | `GET /v3/priorities` |
| `get_resolutions` | api/administration |  |  | да | **нет** | `GET /v3/resolutions` |
| `get_statuses` | api/administration |  |  | да | **нет** | `GET /v3/statuses` |
| `create_board_column` | api/boards | да |  | да | **нет** | `POST /v3/boards/probe_boardId/columns/` |
| `create_board` | api/boards | да |  | да | **нет** | `POST /v2/boards` |
| `delete_board_column` | api/boards | да | да | да | **нет** | `DELETE /v3/boards/probe_boardId/columns/probe_columnId` |
| `delete_board` | api/boards | да | да | да | **нет** | `DELETE /v2/boards/probe_boardId` |
| `get_board_columns` | api/boards |  |  | да | **нет** | `GET /v3/boards/probe_boardId/columns` |
| `get_board` | api/boards |  |  | да | **нет** | `GET /v2/boards/probe_boardId` |
| `get_boards` | api/boards |  |  | да | **нет** | `GET /v2/boards` |
| `update_board_column` | api/boards | да |  | да | **нет** | `PATCH /v3/boards/probe_boardId/columns/probe_columnId` |
| `update_board` | api/boards | да |  | да | **нет** | `PATCH /v2/boards/probe_boardId` |
| `bulk_move_issues` | api/bulk-change | да |  | да | **нет** | `POST /v2/bulkchange/_move` |
| `get_bulk_change_status` | api/bulk-change |  |  | да | **нет** | `GET /v2/bulkchange/probe_operationId` |
| `bulk_transition_issues` | api/bulk-change | да |  | да | **нет** | `POST /v2/bulkchange/_transition` |
| `bulk_update_issues` | api/bulk-change | да |  | да | **нет** | `POST /v2/bulkchange/_update` |
| `add_checklist_item` | api/checklists | да |  | да | да | `POST /v2/issues/TEST-1/checklistItems` |
| `delete_checklist_item` | api/checklists | да | да | да | да | `DELETE /v2/issues/TEST-1/checklistItems/probe_items___itemId` |
| `get_checklist` | api/checklists |  |  | да | да | — |
| `update_checklist_item` | api/checklists | да |  | да | да | `PATCH /v2/issues/TEST-1/checklistItems/probe_items___checklistItemId` |
| `add_comment` | api/comments | да |  | да | да | `POST /v3/issues/TEST-1/comments` |
| `delete_comment` | api/comments | да | да | да | да | `DELETE /v3/issues/TEST-1/comments/probe_comments___commentId` |
| `edit_comment` | api/comments | да |  | да | да | `PATCH /v3/issues/TEST-1/comments/probe_comments___commentId` |
| `get_comments` | api/comments |  |  | да | да | — |
| `create_component` | api/components | да |  | да | да | `POST /v2/queues/probe_queueId/components` |
| `delete_component` | api/components | да | да | да | да | `DELETE /v2/components/probe_componentId`, `GET /v2/components/probe_componentId` |
| `get_components` | api/components |  |  | да | да | `GET /v2/queues/probe_queueId/components` |
| `update_component` | api/components | да |  | да | да | `PATCH /v2/components/probe_componentId` |
| `add_goal_key_result` | api/entities | да |  | да | **нет** | `PATCH /v3/entities/goal/probe_goalId` |
| `clear_goal_key_results` | api/entities | да | да | да | **нет** | `PATCH /v3/entities/goal/probe_goalId` |
| `create_entity` | api/entities | да |  | да | **нет** | `POST /v3/entities/goal` |
| `delete_entity` | api/entities | да | да | да | **нет** | `DELETE /v3/entities/goal/probe_entityId` |
| `find_entities` | api/entities |  |  | да | **нет** | — |
| `get_entity` | api/entities |  |  | да | **нет** | `GET /v3/entities/goal/probe_entityId` |
| `get_goal_key_results` | api/entities |  |  | да | **нет** | `GET /v3/entities/goal/probe_goalId` |
| `set_goal_key_results` | api/entities | да | да | да | **нет** | `PATCH /v3/entities/goal/probe_goalId` |
| `update_entity` | api/entities | да |  | да | **нет** | `PATCH /v3/entities/goal/probe_entityId` |
| `create_global_field` | api/fields | да |  | да | **нет** | `POST /v2/fields` |
| `delete_global_field` | api/fields | да | да | да | **нет** | `DELETE /v2/fields/probe_fieldId` |
| `get_global_field` | api/fields |  |  | да | **нет** | `GET /v2/fields/probe_fieldId` |
| `get_global_fields` | api/fields |  |  | да | **нет** | `GET /v2/fields` |
| `update_global_field` | api/fields | да |  | да | **нет** | `PATCH /v2/fields/probe_fieldId` |
| `create_filter` | api/filters | да |  | да | **нет** | `POST /v3/filters/` |
| `get_filters` | api/filters |  |  | да | **нет** | `GET /v3/myself/favorites/filters` |
| `update_filter` | api/filters | да |  | да | **нет** | `PATCH /v3/filters/probe_filterId` |
| `analyze_issue_description` | api/issues |  |  | да | **нет** | `GET /v3/issues/TEST-1` |
| `delete_attachment` | api/issues | да | да | **нет** | да | `DELETE /v2/issues/TEST-1/attachments/probe_attachmentId` |
| `download_attachment` | api/issues | да |  | **нет** | да | `GET /v2/issues/TEST-1/attachments` |
| `get_attachments` | api/issues |  |  | да | да | `GET /v2/issues/TEST-1/attachments` |
| `get_thumbnail` | api/issues | да |  | **нет** | да | `GET /v2/issues/TEST-1/attachments` |
| `upload_attachment` | api/issues | да |  | **нет** | да | `POST /v2/issues/TEST-1/attachments` |
| `get_issue_changelog` | api/issues |  |  | да | да | — |
| `create_issue` | api/issues | да |  | да | да | `POST /v3/issues` |
| `find_issues` | api/issues |  |  | да | да | — |
| `get_issues` | api/issues |  |  | да | да | `GET /v3/issues/TEST-1` |
| `create_link` | api/issues | да |  | да | да | `POST /v3/issues/TEST-1/links` |
| `delete_link` | api/issues | да | да | да | да | `DELETE /v3/issues/TEST-1/links/probe_links___linkId` |
| `get_issue_links` | api/issues |  |  | да | да | — |
| `transition_issue` | api/issues | да |  | да | да | `GET /v3/issues/TEST-1`, `POST /v3/issues/TEST-1/transitions/probe_transitionId/_execute` |
| `get_issue_transitions` | api/issues |  |  | да | да | `GET /v3/issues/TEST-1/transitions` |
| `update_issue` | api/issues | да |  | да | да | `PATCH /v3/issues/TEST-1` |
| `create_project` | api/projects | да |  | да | **нет** | `POST /v2/projects` |
| `delete_project` | api/projects | да | да | да | **нет** | `DELETE /v2/projects/probe_projectId` |
| `get_project` | api/projects |  |  | да | **нет** | `GET /v2/projects/probe_projectId` |
| `get_projects` | api/projects |  |  | да | **нет** | — |
| `update_project` | api/projects | да |  | да | **нет** | `PATCH /v2/projects/probe_projectId` |
| `create_queue_local_field` | api/queue-local-fields | да |  | да | **нет** | `POST /v3/queues/probe_queueId/localFields` |
| `get_queue_local_fields` | api/queue-local-fields |  |  | да | **нет** | `GET /v3/queues/probe_queueId/localFields` |
| `update_queue_local_field` | api/queue-local-fields | да |  | да | **нет** | `PATCH /v3/queues/probe_queueId/localFields/probe_key` |
| `create_queue` | api/queues | да |  | да | да | `POST /v3/queues/` |
| `get_queue_fields` | api/queues |  |  | да | да | `GET /v3/queues/probe_queueId/fields` |
| `get_queue` | api/queues |  |  | да | да | `GET /v3/queues/probe_queueId` |
| `get_queues` | api/queues |  |  | да | да | — |
| `manage_queue_access` | api/queues | да |  | да | да | `PATCH /v3/queues/probe_queueId/permissions` |
| `update_queue` | api/queues | да |  | да | да | `PATCH /v3/queues/probe_queueId` |
| `raw_api_request` | api/raw |  |  | да | **нет** | — |
| `create_sprint` | api/sprints | да |  | да | **нет** | `POST /v2/sprints` |
| `get_sprint` | api/sprints |  |  | да | **нет** | `GET /v2/sprints/probe_sprintId` |
| `get_sprints` | api/sprints |  |  | да | **нет** | `GET /v2/boards/probe_boardId/sprints` |
| `manage_sprint_lifecycle` | api/sprints | да | да | да | **нет** | `POST /v3/sprints/probe_sprintId/_start` |
| `update_sprint` | api/sprints | да |  | да | **нет** | `PATCH /v2/sprints/probe_sprintId` |
| `find_users` | api/users |  |  | да | **нет** | — |
| `get_users` | api/users |  |  | да | **нет** | `GET /v3/users/probe_userIds__` |
| `add_worklog` | api/worklog | да |  | да | **нет** | `POST /v2/issues/TEST-1/worklog` |
| `delete_worklog` | api/worklog | да | да | **нет** | **нет** | `DELETE /v2/issues/TEST-1/worklog/probe_worklogId` |
| `get_worklogs` | api/worklog |  |  | да | **нет** | — |
| `search_worklog` | api/worklog |  |  | да | **нет** | — |
| `update_worklog` | api/worklog | да |  | да | **нет** | `PATCH /v2/issues/TEST-1/worklog/probe_worklogId` |
| `demo` | helpers/demo |  |  | да | **нет** | — |
| `get_issue_urls` | helpers/issue-url |  |  | да | **нет** | — |
| `ping` | ping.metadata.ts |  |  | да | **нет** | `GET /v3/myself` |
