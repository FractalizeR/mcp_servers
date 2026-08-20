# Перечисление исходящих HTTP-запросов инструментов Трекера

**Чем получено:** `scripts/enumerate-outgoing-requests.ts` — обход `TOOL_CLASSES`,
синтетический образец параметров из Zod-схемы, перехват на `axios.defaults.adapter`
(ловит и обходные пути `getAxiosInstance()`), ответ-заглушка `200 {}`.

**Чего способ НЕ видит:** ветки, требующие правдоподобного ответа сервера (вторая
страница пагинации, второй запрос после чтения списка); пути, зависящие от значений
в ответе; инструменты, упавшие на валидации синтетического образца — они перечислены
отдельным списком ниже и требуют ручного разбора.

| Инструмент | readOnly | destructive | Метод | Путь | Ключи тела |
|---|:--:|:--:|---|---|---|
| `fr_yandex_tracker_ping` | да | нет | GET | `/v3/myself` | — |
| `fr_yandex_tracker_get_issues` | да | нет | GET | `/v3/issues/TEST-1` | — |
| `fr_yandex_tracker_create_issue` | нет | нет | POST | `/v3/issues` | queue, summary, description, assignee, priority, type, markerKey, unique |
| `fr_yandex_tracker_update_issue` | нет | нет | PATCH | `/v3/issues/TEST-1?version=189201` | summary, description, assignee, priority, type, markerKey |
| `fr_yandex_tracker_analyze_issue_description` | да | нет | GET | `/v3/issues/TEST-1` | — |
| `fr_yandex_tracker_get_issue_transitions` | да | нет | GET | `/v3/issues/TEST-1/transitions` | — |
| `fr_yandex_tracker_transition_issue` | нет | нет | POST | `/v3/issues/TEST-1/transitions/probe_transitionId/_execute` | comment, markerKey |
| `fr_yandex_tracker_transition_issue` | нет | нет | GET | `/v3/issues/TEST-1` | — |
| `fr_yandex_tracker_get_queue` | да | нет | GET | `/v3/queues/probe_queueId?expand=probe_expand` | — |
| `fr_yandex_tracker_create_queue` | нет | нет | POST | `/v3/queues/` | key, name, lead, defaultType, defaultPriority, description, issueTypes |
| `fr_yandex_tracker_update_queue` | нет | нет | PATCH | `/v3/queues/probe_queueId` | name, lead, defaultType, defaultPriority, description, issueTypes |
| `fr_yandex_tracker_get_queue_fields` | да | нет | GET | `/v3/queues/probe_queueId/fields` | — |
| `fr_yandex_tracker_manage_queue_access` | нет | нет | PATCH | `/v3/queues/probe_queueId/permissions` | queue-lead |
| `fr_yandex_tracker_get_components` | да | нет | GET | `/v2/queues/probe_queueId/components` | — |
| `fr_yandex_tracker_create_component` | нет | нет | POST | `/v2/queues/probe_queueId/components` | name, description, lead, assignAuto |
| `fr_yandex_tracker_update_component` | нет | нет | PATCH | `/v2/components/probe_componentId` | name, description, lead, assignAuto |
| `fr_yandex_tracker_delete_component` | нет | да | GET | `/v2/components/probe_componentId` | — |
| `fr_yandex_tracker_delete_component` | нет | да | DELETE | `/v2/components/probe_componentId` | — |
| `fr_yandex_tracker_create_link` | нет | нет | POST | `/v3/issues/TEST-1/links` | relationship, issue |
| `fr_yandex_tracker_delete_link` | нет | да | DELETE | `/v3/issues/TEST-1/links/probe_links___linkId` | — |
| `fr_yandex_tracker_add_comment` | нет | нет | POST | `/v3/issues/TEST-1/comments?isAddToFollowers=true` | text, attachmentIds, summonees, maillistSummonees, markupType |
| `fr_yandex_tracker_edit_comment` | нет | нет | PATCH | `/v3/issues/TEST-1/comments/probe_comments___commentId` | text |
| `fr_yandex_tracker_delete_comment` | нет | да | DELETE | `/v3/issues/TEST-1/comments/probe_comments___commentId` | — |
| `fr_yandex_tracker_get_attachments` | да | нет | GET | `/v2/issues/TEST-1/attachments` | — |
| `fr_yandex_tracker_upload_attachment` | нет | нет | POST | `/v2/issues/TEST-1/attachments` | — |
| `fr_yandex_tracker_download_attachment` | нет | нет | GET | `/v2/issues/TEST-1/attachments` | — |
| `fr_yandex_tracker_delete_attachment` | нет | да | DELETE | `/v2/issues/TEST-1/attachments/probe_attachmentId` | — |
| `fr_yandex_tracker_get_thumbnail` | нет | нет | GET | `/v2/issues/TEST-1/attachments` | — |
| `fr_yandex_tracker_add_checklist_item` | нет | нет | POST | `/v2/issues/TEST-1/checklistItems` | text, checked, assignee, deadline |
| `fr_yandex_tracker_update_checklist_item` | нет | нет | PATCH | `/v2/issues/TEST-1/checklistItems/probe_items___checklistItemId` | text, checked, assignee, deadline |
| `fr_yandex_tracker_delete_checklist_item` | нет | да | DELETE | `/v2/issues/TEST-1/checklistItems/probe_items___itemId` | — |
| `fr_yandex_tracker_get_project` | да | нет | GET | `/v2/projects/probe_projectId?expand=probe_expand` | — |
| `fr_yandex_tracker_create_project` | нет | нет | POST | `/v2/projects` | key, name, lead, status, description, startDate, endDate, queueIds, teamUserIds |
| `fr_yandex_tracker_update_project` | нет | нет | PATCH | `/v2/projects/probe_projectId` | name, lead, status, description, startDate, endDate, queueIds, teamUserIds |
| `fr_yandex_tracker_delete_project` | нет | да | DELETE | `/v2/projects/probe_projectId` | — |
| `fr_yandex_tracker_add_worklog` | нет | нет | POST | `/v2/issues/TEST-1/worklog` | start, duration, comment |
| `fr_yandex_tracker_update_worklog` | нет | нет | PATCH | `/v2/issues/TEST-1/worklog/probe_worklogId` | start, duration, comment |
| `fr_yandex_tracker_delete_worklog` | нет | да | DELETE | `/v2/issues/TEST-1/worklog/probe_worklogId` | — |
| `fr_yandex_tracker_bulk_update_issues` | нет | нет | POST | `/v2/bulkchange/_update` | issues, values |
| `fr_yandex_tracker_bulk_transition_issues` | нет | нет | POST | `/v2/bulkchange/_transition` | issues, transition, values |
| `fr_yandex_tracker_bulk_move_issues` | нет | нет | POST | `/v2/bulkchange/_move` | issues, queue, moveAllFields, initialStatus, values |
| `fr_yandex_tracker_get_bulk_change_status` | да | нет | GET | `/v2/bulkchange/probe_operationId` | — |
| `fr_yandex_tracker_get_boards` | да | нет | GET | `/v2/boards?localized=true` | — |
| `fr_yandex_tracker_get_board` | да | нет | GET | `/v2/boards/probe_boardId?localized=true` | — |
| `fr_yandex_tracker_create_board` | нет | нет | POST | `/v2/boards` | name, queue, columns, filter, orderBy, orderAsc, query, useRanking, country |
| `fr_yandex_tracker_update_board` | нет | нет | PATCH | `/v2/boards/probe_boardId` | name, version, columns, filter, orderBy, orderAsc, query, useRanking, country |
| `fr_yandex_tracker_delete_board` | нет | да | DELETE | `/v2/boards/probe_boardId` | — |
| `fr_yandex_tracker_get_sprints` | да | нет | GET | `/v2/boards/probe_boardId/sprints` | — |
| `fr_yandex_tracker_get_sprint` | да | нет | GET | `/v2/sprints/probe_sprintId` | — |
| `fr_yandex_tracker_create_sprint` | нет | нет | POST | `/v2/sprints` | name, board, startDate, endDate, startDateTime, endDateTime, status |
| `fr_yandex_tracker_update_sprint` | нет | нет | PATCH | `/v2/sprints/probe_sprintId` | name, version, startDate, endDate, startDateTime, endDateTime, status |
| `fr_yandex_tracker_get_entity` | да | нет | GET | `/v3/entities/goal/probe_entityId` | — |
| `fr_yandex_tracker_create_entity` | нет | нет | POST | `/v3/entities/goal` | fields |
| `fr_yandex_tracker_update_entity` | нет | нет | PATCH | `/v3/entities/goal/probe_entityId?version=189201` | fields |
| `fr_yandex_tracker_delete_entity` | нет | да | DELETE | `/v3/entities/goal/probe_entityId` | — |
| `fr_yandex_tracker_get_goal_key_results` | да | нет | GET | `/v3/entities/goal/probe_goalId?fields=keyResultItems` | — |
| `fr_yandex_tracker_add_goal_key_result` | нет | нет | PATCH | `/v3/entities/goal/probe_goalId?fields=keyResultItems` | fields |
| `fr_yandex_tracker_set_goal_key_results` | нет | да | PATCH | `/v3/entities/goal/probe_goalId?fields=keyResultItems` | fields |
| `fr_yandex_tracker_clear_goal_key_results` | нет | да | PATCH | `/v3/entities/goal/probe_goalId?fields=keyResultItems` | fields |
| `fr_yandex_tracker_get_users` | да | нет | GET | `/v3/users/probe_userIds__` | — |
| `fr_yandex_tracker_get_issue_types` | да | нет | GET | `/v3/issuetypes` | — |
| `fr_yandex_tracker_get_statuses` | да | нет | GET | `/v3/statuses` | — |
| `fr_yandex_tracker_get_resolutions` | да | нет | GET | `/v3/resolutions` | — |
| `fr_yandex_tracker_get_priorities` | да | нет | GET | `/v3/priorities` | — |
| `fr_yandex_tracker_get_filters` | да | нет | GET | `/v3/myself/favorites/filters` | — |
| `fr_yandex_tracker_create_filter` | нет | нет | POST | `/v3/filters/` | name, filter, query, sorts, fields, groupBy |
| `fr_yandex_tracker_update_filter` | нет | нет | PATCH | `/v3/filters/probe_filterId` | name, filter, query, sorts, fields, groupBy |
| `fr_yandex_tracker_get_queue_local_fields` | да | нет | GET | `/v3/queues/probe_queueId/localFields` | — |
| `fr_yandex_tracker_create_queue_local_field` | нет | нет | POST | `/v3/queues/probe_queueId/localFields` | id, name, category, type |
| `fr_yandex_tracker_update_queue_local_field` | нет | нет | PATCH | `/v3/queues/probe_queueId/localFields/probe_key` | name, category, order, description, readonly, visible, hidden |
| `fr_yandex_tracker_get_board_columns` | да | нет | GET | `/v3/boards/probe_boardId/columns` | — |
| `fr_yandex_tracker_create_board_column` | нет | нет | POST | `/v3/boards/probe_boardId/columns/` | name, statuses |
| `fr_yandex_tracker_update_board_column` | нет | нет | PATCH | `/v3/boards/probe_boardId/columns/probe_columnId` | name, statuses, limit |
| `fr_yandex_tracker_delete_board_column` | нет | да | DELETE | `/v3/boards/probe_boardId/columns/probe_columnId` | — |
| `fr_yandex_tracker_manage_sprint_lifecycle` | нет | да | POST | `/v3/sprints/probe_sprintId/_start` | — |
| `fr_yandex_tracker_get_global_fields` | да | нет | GET | `/v2/fields` | — |
| `fr_yandex_tracker_get_global_field` | да | нет | GET | `/v2/fields/probe_fieldId` | — |
| `fr_yandex_tracker_create_global_field` | нет | нет | POST | `/v2/fields` | name, description, schema, readonly, options, suggest, optionsProvider |
| `fr_yandex_tracker_update_global_field` | нет | нет | PATCH | `/v2/fields/probe_fieldId` | name, description, readonly, options, suggest, optionsProvider |
| `fr_yandex_tracker_delete_global_field` | нет | да | DELETE | `/v2/fields/probe_fieldId` | — |

## Инструменты без зафиксированного запроса (14)

- fr_yandex_tracker_find_issues — запросов нет (выполнился без HTTP)
- fr_yandex_tracker_get_issue_changelog — запросов нет (выполнился без HTTP)
- fr_yandex_tracker_get_queues — запросов нет (выполнился без HTTP)
- fr_yandex_tracker_get_issue_links — запросов нет (выполнился без HTTP)
- fr_yandex_tracker_get_comments — запросов нет (выполнился без HTTP)
- fr_yandex_tracker_get_checklist — запросов нет (выполнился без HTTP)
- fr_yandex_tracker_get_projects — запросов нет (выполнился без HTTP)
- fr_yandex_tracker_get_worklogs — запросов нет (выполнился без HTTP)
- fr_yandex_tracker_get_issue_urls — запросов нет (выполнился без HTTP)
- fr_yandex_tracker_demo — запросов нет (выполнился без HTTP)
- fr_yandex_tracker_raw_api_request — генератор образца упал: generateReachabilitySample: нет образца для pattern ^\/v[23]\/[\w.~\/-]*$ на "path" — добавь запись в knownRegexSamples (см. GenerateReachabilitySampleOptions)
- fr_yandex_tracker_find_entities — запросов нет (выполнился без HTTP)
- fr_yandex_tracker_find_users — запросов нет (выполнился без HTTP)
- fr_yandex_tracker_search_worklog — запросов нет (выполнился без HTTP)
