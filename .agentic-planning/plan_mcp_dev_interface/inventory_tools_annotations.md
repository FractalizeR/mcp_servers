# Инвентарь: annotations всех tool-метаданных трёх серверов

**Чем получено:** статический парс `packages/servers/*/src/**/*.metadata.ts` (regex по `name:`/`annotations:`), запуск 2026-08-19 в worktree `mcp-tools-dev-interface-577f72`.

**Чего этот способ НЕ видит:** (1) дефолты annotations, проставляемые в `generateDefinitionFromSchema`/`BaseTool`, если поле `annotations` в метаданных отсутствует; (2) инструменты, чьи метаданные объявлены не в `*.metadata.ts`; (3) инструменты, не зарегистрированные в DI-контейнере (файл есть — регистрации нет) и наоборот; (4) переопределение annotations в рантайме. Каналы (1)-(3) закрываются проверкой из пакета 1 (dump через реальный tools/list) — до неё таблица считается предварительной.


**Статус: предварительный.** Таблица проверяет НАЛИЧИЕ хинтов, а не их семантическую верность. Известное расхождение: `yandex-wiki / download_attachment` помечен `readOnlyHint: true`, но `download-attachment.tool.ts:30` делает `writeFile` на локальную ФС; в tracker те же по смыслу `download_attachment` и `get_thumbnail` помечены `false` после осознанной правки (комментарий «пакет 3.1.G» в метаданных). Полная сверка — пакет 1.3 плана.

**Итого файлов метаданных:** 153

| Сервер | Tool | readOnly | destructive | idempotent | openWorld | Файл |
|---|---|---|---|---|---|---|
| yandex-tracker | get_issue_types | true | false | true | true | get-issue-types.metadata.ts |
| yandex-tracker | get_priorities | true | false | true | true | get-priorities.metadata.ts |
| yandex-tracker | get_resolutions | true | false | true | true | get-resolutions.metadata.ts |
| yandex-tracker | get_statuses | true | false | true | true | get-statuses.metadata.ts |
| yandex-tracker | create_board_column | false | false | false | true | create-board-column.metadata.ts |
| yandex-tracker | create_board | false | false | false | true | create-board.metadata.ts |
| yandex-tracker | delete_board_column | false | true | true | true | delete-board-column.metadata.ts |
| yandex-tracker | delete_board | false | true | true | true | delete-board.metadata.ts |
| yandex-tracker | get_board_columns | true | false | true | true | get-board-columns.metadata.ts |
| yandex-tracker | get_board | true | false | true | true | get-board.metadata.ts |
| yandex-tracker | get_boards | true | false | true | true | get-boards.metadata.ts |
| yandex-tracker | update_board_column | false | false | true | true | update-board-column.metadata.ts |
| yandex-tracker | update_board | false | false | true | true | update-board.metadata.ts |
| yandex-tracker | bulk_move_issues | false | false | true | true | bulk-move-issues.metadata.ts |
| yandex-tracker | get_bulk_change_status | true | false | true | true | get-bulk-change-status.metadata.ts |
| yandex-tracker | bulk_transition_issues | false | false | false | true | bulk-transition-issues.metadata.ts |
| yandex-tracker | bulk_update_issues | false | false | true | true | bulk-update-issues.metadata.ts |
| yandex-tracker | add_checklist_item | false | false | false | true | add-checklist-item.metadata.ts |
| yandex-tracker | delete_checklist_item | false | true | true | true | delete-checklist-item.metadata.ts |
| yandex-tracker | get_checklist | true | false | true | true | get-checklist.metadata.ts |
| yandex-tracker | update_checklist_item | false | false | true | true | update-checklist-item.metadata.ts |
| yandex-tracker | add_comment | false | false | false | true | add-comment.metadata.ts |
| yandex-tracker | delete_comment | false | true | true | true | delete-comment.metadata.ts |
| yandex-tracker | edit_comment | false | false | true | true | edit-comment.metadata.ts |
| yandex-tracker | get_comments | true | false | true | true | get-comments.metadata.ts |
| yandex-tracker | create_component | false | false | false | true | create-component.metadata.ts |
| yandex-tracker | delete_component | false | true | true | true | delete-component.metadata.ts |
| yandex-tracker | get_components | true | false | true | true | get-components.metadata.ts |
| yandex-tracker | update_component | false | false | true | true | update-component.metadata.ts |
| yandex-tracker | add_goal_key_result | false | false | false | true | add-goal-key-result.metadata.ts |
| yandex-tracker | clear_goal_key_results | false | true | true | true | clear-goal-key-results.metadata.ts |
| yandex-tracker | create_entity | false | false | false | true | create-entity.metadata.ts |
| yandex-tracker | delete_entity | false | true | true | true | delete-entity.metadata.ts |
| yandex-tracker | find_entities | true | false | true | true | find-entities.metadata.ts |
| yandex-tracker | get_entity | true | false | true | true | get-entity.metadata.ts |
| yandex-tracker | get_goal_key_results | true | false | true | true | get-goal-key-results.metadata.ts |
| yandex-tracker | set_goal_key_results | false | true | true | true | set-goal-key-results.metadata.ts |
| yandex-tracker | update_entity | false | false | true | true | update-entity.metadata.ts |
| yandex-tracker | create_global_field | false | false | false | true | create-global-field.metadata.ts |
| yandex-tracker | delete_global_field | false | true | true | true | delete-global-field.metadata.ts |
| yandex-tracker | get_global_field | true | false | true | true | get-global-field.metadata.ts |
| yandex-tracker | get_global_fields | true | false | true | true | get-global-fields.metadata.ts |
| yandex-tracker | update_global_field | false | false | true | true | update-global-field.metadata.ts |
| yandex-tracker | create_filter | false | false | false | true | create-filter.metadata.ts |
| yandex-tracker | get_filters | true | false | true | true | get-filters.metadata.ts |
| yandex-tracker | update_filter | false | false | true | true | update-filter.metadata.ts |
| yandex-tracker | analyze_issue_description | true | false | true | true | analyze-issue-description.metadata.ts |
| yandex-tracker | delete_attachment | false | true | true | true | delete-attachment.metadata.ts |
| yandex-tracker | download_attachment | false | false | true | true | download-attachment.metadata.ts |
| yandex-tracker | get_attachments | true | false | true | true | get-attachments.metadata.ts |
| yandex-tracker | get_thumbnail | false | false | true | true | get-thumbnail.metadata.ts |
| yandex-tracker | upload_attachment | false | false | false | true | upload-attachment.metadata.ts |
| yandex-tracker | get_issue_changelog | true | false | true | true | get-issue-changelog.metadata.ts |
| yandex-tracker | create_issue | false | false | false | true | create-issue.metadata.ts |
| yandex-tracker | find_issues | true | false | true | true | find-issues.metadata.ts |
| yandex-tracker | get_issues | true | false | true | true | get-issues.metadata.ts |
| yandex-tracker | create_link | false | false | false | true | create-link.metadata.ts |
| yandex-tracker | delete_link | false | true | true | true | delete-link.metadata.ts |
| yandex-tracker | get_issue_links | true | false | true | true | get-issue-links.metadata.ts |
| yandex-tracker | transition_issue | false | false | false | true | transition-issue.metadata.ts |
| yandex-tracker | get_issue_transitions | true | false | true | true | get-issue-transitions.metadata.ts |
| yandex-tracker | update_issue | false | false | true | true | update-issue.metadata.ts |
| yandex-tracker | create_project | false | false | false | true | create-project.metadata.ts |
| yandex-tracker | delete_project | false | true | true | true | delete-project.metadata.ts |
| yandex-tracker | get_project | true | false | true | true | get-project.metadata.ts |
| yandex-tracker | get_projects | true | false | true | true | get-projects.metadata.ts |
| yandex-tracker | update_project | false | false | true | true | update-project.metadata.ts |
| yandex-tracker | create_queue_local_field | false | false | false | true | create-queue-local-field.metadata.ts |
| yandex-tracker | get_queue_local_fields | true | false | true | true | get-queue-local-fields.metadata.ts |
| yandex-tracker | update_queue_local_field | false | false | true | true | update-queue-local-field.metadata.ts |
| yandex-tracker | create_queue | false | false | false | true | create-queue.metadata.ts |
| yandex-tracker | get_queue_fields | true | false | true | true | get-queue-fields.metadata.ts |
| yandex-tracker | get_queue | true | false | true | true | get-queue.metadata.ts |
| yandex-tracker | get_queues | true | false | true | true | get-queues.metadata.ts |
| yandex-tracker | manage_queue_access | false | false | true | true | manage-queue-access.metadata.ts |
| yandex-tracker | update_queue | false | false | true | true | update-queue.metadata.ts |
| yandex-tracker | raw_api_request | true | false | true | true | raw-api-request.metadata.ts |
| yandex-tracker | create_sprint | false | false | false | true | create-sprint.metadata.ts |
| yandex-tracker | get_sprint | true | false | true | true | get-sprint.metadata.ts |
| yandex-tracker | get_sprints | true | false | true | true | get-sprints.metadata.ts |
| yandex-tracker | manage_sprint_lifecycle | false | true | true | true | manage-sprint-lifecycle.metadata.ts |
| yandex-tracker | update_sprint | false | false | true | true | update-sprint.metadata.ts |
| yandex-tracker | find_users | true | false | true | true | find-users.metadata.ts |
| yandex-tracker | get_users | true | false | true | true | get-users.metadata.ts |
| yandex-tracker | add_worklog | false | false | false | true | add-worklog.metadata.ts |
| yandex-tracker | delete_worklog | false | true | true | true | delete-worklog.metadata.ts |
| yandex-tracker | get_worklogs | true | false | true | true | get-worklogs.metadata.ts |
| yandex-tracker | search_worklog | true | false | true | true | search-worklog.metadata.ts |
| yandex-tracker | update_worklog | false | false | true | true | update-worklog.metadata.ts |
| yandex-tracker | demo | true | false | true | false | demo.metadata.ts |
| yandex-tracker | get_issue_urls | true | false | true | false | issue-url.metadata.ts |
| yandex-tracker | ping | true | false | true | true | ping.metadata.ts |
| yandex-wiki | download_attachment | true | false | true | true | download-attachment.metadata.ts |
| yandex-wiki | upload_attachment | false | false | false | true | upload-attachment.metadata.ts |
| yandex-wiki | create_comment | false | false | false | true | create-comment.metadata.ts |
| yandex-wiki | delete_comment | false | true | true | true | delete-comment.metadata.ts |
| yandex-wiki | get_comments | true | false | true | true | get-comments.metadata.ts |
| yandex-wiki | get_comment_thread | true | false | true | true | get-comment-thread.metadata.ts |
| yandex-wiki | update_cells | false | true | true | true | update-cells.metadata.ts |
| yandex-wiki | clone_grid | false | false | false | true | clone-grid.metadata.ts |
| yandex-wiki | add_columns | false | false | false | true | add-columns.metadata.ts |
| yandex-wiki | move_columns | false | false | true | true | move-columns.metadata.ts |
| yandex-wiki | remove_columns | false | true | true | true | remove-columns.metadata.ts |
| yandex-wiki | create_grid | false | false | false | true | create-grid.metadata.ts |
| yandex-wiki | delete_grid | false | true | true | true | delete-grid.metadata.ts |
| yandex-wiki | get_grid | true | false | true | true | get-grid.metadata.ts |
| yandex-wiki | add_rows | false | false | false | true | add-rows.metadata.ts |
| yandex-wiki | move_rows | false | false | true | true | move-rows.metadata.ts |
| yandex-wiki | remove_rows | false | true | true | true | remove-rows.metadata.ts |
| yandex-wiki | update_grid | false | true | true | true | update-grid.metadata.ts |
| yandex-wiki | add_page_access | false | false | false | true | add-page-access.metadata.ts |
| yandex-wiki | remove_all_page_access | false | true | true | true | remove-all-page-access.metadata.ts |
| yandex-wiki | remove_page_access | false | true | true | true | remove-page-access.metadata.ts |
| yandex-wiki | update_page_access | false | false | true | true | update-page-access.metadata.ts |
| yandex-wiki | append_content | false | false | false | true | append-content.metadata.ts |
| yandex-wiki | clone_page | false | false | false | true | clone-page.metadata.ts |
| yandex-wiki | create_page | false | false | false | true | create-page.metadata.ts |
| yandex-wiki | delete_page | false | true | true | true | delete-page.metadata.ts |
| yandex-wiki | get_descendants_by_id | true | false | true | true | get-descendants-by-id.metadata.ts |
| yandex-wiki | get_descendants | true | false | true | true | get-descendants.metadata.ts |
| yandex-wiki | diff_page | true | false | true | true | diff-page.metadata.ts |
| yandex-wiki | get_page_by_id | true | false | true | true | get-page-by-id.metadata.ts |
| yandex-wiki | get_page | true | false | true | true | get-page.metadata.ts |
| yandex-wiki | update_page | false | true | true | true | update-page.metadata.ts |
| yandex-wiki | raw_api_request | true | false | true | true | raw-api-request.metadata.ts |
| yandex-wiki | get_resources | true | false | true | true | get-resources.metadata.ts |
| yandex-wiki | search | true | false | true | true | search.metadata.ts |
| yandex-wiki | ping | true | false | true | true | ping.metadata.ts |
| ticktick | get_overdue_tasks | true | false | true | true | get-overdue-tasks.metadata.ts |
| ticktick | get_tasks_due_in_days | true | false | true | true | get-tasks-due-in-days.metadata.ts |
| ticktick | get_tasks_due_this_week | true | false | true | true | get-tasks-due-this-week.metadata.ts |
| ticktick | get_tasks_due_today | true | false | true | true | get-tasks-due-today.metadata.ts |
| ticktick | get_tasks_due_tomorrow | true | false | true | true | get-tasks-due-tomorrow.metadata.ts |
| ticktick | create_project | false | false | false | true | create-project.metadata.ts |
| ticktick | delete_project | false | true | true | true | delete-project.metadata.ts |
| ticktick | get_project_tasks | true | false | true | true | get-project-tasks.metadata.ts |
| ticktick | get_project | true | false | true | true | get-project.metadata.ts |
| ticktick | get_projects | true | false | true | true | get-projects.metadata.ts |
| ticktick | update_project | false | false | true | true | update-project.metadata.ts |
| ticktick | raw_api_request | true | false | true | true | raw-api-request.metadata.ts |
| ticktick | get_engaged_tasks | true | false | true | true | get-engaged-tasks.metadata.ts |
| ticktick | get_next_tasks | true | false | true | true | get-next-tasks.metadata.ts |
| ticktick | ping | true | false | true | true | ping.metadata.ts |
| ticktick | batch_create_tasks | false | false | false | true | batch-create-tasks.metadata.ts |
| ticktick | complete_task | false | true | true | true | complete-task.metadata.ts |
| ticktick | create_task | false | false | false | true | create-task.metadata.ts |
| ticktick | delete_task | false | true | true | true | delete-task.metadata.ts |
| ticktick | get_all_tasks | true | false | true | true | get-all-tasks.metadata.ts |
| ticktick | get_task | true | false | true | true | get-task.metadata.ts |
| ticktick | get_tasks_by_priority | true | false | true | true | get-tasks-by-priority.metadata.ts |
| ticktick | get_tasks | true | false | true | true | get-tasks.metadata.ts |
| ticktick | search_tasks | true | false | true | true | search-tasks.metadata.ts |
| ticktick | update_task | false | false | true | true | update-task.metadata.ts |

## Сводка

- **yandex-tracker**: 92 tools; readOnlyHint: {'true': 40, 'false': 52}; destructiveHint: {'false': 78, 'true': 14}
- **yandex-wiki**: 36 tools; readOnlyHint: {'true': 13, 'false': 23}; destructiveHint: {'false': 26, 'true': 10}
- **ticktick**: 25 tools; readOnlyHint: {'true': 17, 'false': 8}; destructiveHint: {'false': 22, 'true': 3}

- **Без явных readOnly/destructive:** 0
