# Инвентарь MCP-инструментов Яндекс.Трекера (основание плана)

**Чем получено:** `grep` по `src/tools/**/*.metadata.ts` — имя из `buildToolName('...')`,
`category`, `subcategory`, `annotations.*`, `requiresExplicitUserConsent`, наличие `outputSchema`;
столбцы «integ»/«unit» — сопоставление базового имени файла инструмента с путями `tests/**/*.test.ts`.

**Чего этот способ НЕ видит:**
- инструменты, зарегистрированные в реестре без файла `*.metadata.ts` (сверка — `npm run validate:tools`, шаг 1.1);
- тесты, покрывающие инструмент под другим именем файла (например, общий тест на категорию) — «integ=нет»
  означает «нет файла с этим базовым именем», а не строго «не покрыт»; ложноположительных пропусков это
  не даёт, ложноотрицательные — даёт;
- фактическое включение инструмента в выдачу `tools/list` при `DISABLED_TOOL_GROUPS`;
- расхождение `annotations` с реальным поведением (это предмет проверки К-3, а не инвентаря).

**Итого:** 92 инструмента, 33 с интеграционным тестом, 89 с unit-тестом.
`outputSchema` объявлена у всех 92. `destructiveHint=true` и `requiresExplicitUserConsent=true`
совпадают ровно на 14 инструментах.

| # | Инструмент | Категория | sub | readOnly | destructive | idempotent | integ | unit |
|--:|---|---|---|:--:|:--:|:--:|:--:|:--:|
| 1 | `fr_yandex_tracker_create_board` | BOARDS | write | false | false | false | — | ✅ |
| 2 | `fr_yandex_tracker_create_board_column` | BOARDS | write | false | false | false | — | ✅ |
| 3 | `fr_yandex_tracker_delete_board` | BOARDS | delete | false | true | true | — | ✅ |
| 4 | `fr_yandex_tracker_delete_board_column` | BOARDS | delete | false | true | true | — | ✅ |
| 5 | `fr_yandex_tracker_get_board` | BOARDS | read | true | false | true | — | ✅ |
| 6 | `fr_yandex_tracker_get_board_columns` | BOARDS | read | true | false | true | — | ✅ |
| 7 | `fr_yandex_tracker_get_boards` | BOARDS | read | true | false | true | — | ✅ |
| 8 | `fr_yandex_tracker_update_board` | BOARDS | write | false | false | true | — | ✅ |
| 9 | `fr_yandex_tracker_update_board_column` | BOARDS | write | false | false | true | — | ✅ |
| 10 | `fr_yandex_tracker_add_checklist_item` | CHECKLISTS | write | false | false | false | ✅ | ✅ |
| 11 | `fr_yandex_tracker_delete_checklist_item` | CHECKLISTS | delete | false | true | true | ✅ | ✅ |
| 12 | `fr_yandex_tracker_get_checklist` | CHECKLISTS | read | true | false | true | ✅ | ✅ |
| 13 | `fr_yandex_tracker_update_checklist_item` | CHECKLISTS | write | false | false | true | ✅ | ✅ |
| 14 | `fr_yandex_tracker_add_comment` | COMMENTS | write | false | false | false | ✅ | ✅ |
| 15 | `fr_yandex_tracker_delete_comment` | COMMENTS | delete | false | true | true | ✅ | ✅ |
| 16 | `fr_yandex_tracker_edit_comment` | COMMENTS | write | false | false | true | ✅ | ✅ |
| 17 | `fr_yandex_tracker_get_comments` | COMMENTS | read | true | false | true | ✅ | ✅ |
| 18 | `fr_yandex_tracker_create_component` | COMPONENTS | write | false | false | false | ✅ | ✅ |
| 19 | `fr_yandex_tracker_delete_component` | COMPONENTS | delete | false | true | true | ✅ | ✅ |
| 20 | `fr_yandex_tracker_get_components` | COMPONENTS | read | true | false | true | ✅ | ✅ |
| 21 | `fr_yandex_tracker_update_component` | COMPONENTS | write | false | false | true | ✅ | ✅ |
| 22 | `fr_yandex_tracker_demo` | HELPERS | demo | true | false | true | — | ✅ |
| 23 | `fr_yandex_tracker_get_issue_urls` | HELPERS | url | true | false | true | — | ✅ |
| 24 | `fr_yandex_tracker_add_worklog` | ISSUES | worklog | false | false | false | — | ✅ |
| 25 | `fr_yandex_tracker_analyze_issue_description` | ISSUES | read | true | false | true | — | ✅ |
| 26 | `fr_yandex_tracker_bulk_move_issues` | ISSUES | bulk | false | false | true | — | ✅ |
| 27 | `fr_yandex_tracker_bulk_transition_issues` | ISSUES | bulk | false | false | false | — | — |
| 28 | `fr_yandex_tracker_bulk_update_issues` | ISSUES | bulk | false | false | true | — | — |
| 29 | `fr_yandex_tracker_create_filter` | ISSUES | write | false | false | false | — | ✅ |
| 30 | `fr_yandex_tracker_create_global_field` | ISSUES | write | false | false | false | — | ✅ |
| 31 | `fr_yandex_tracker_create_issue` | ISSUES | write | false | false | false | ✅ | ✅ |
| 32 | `fr_yandex_tracker_create_link` | ISSUES | links | false | false | false | ✅ | ✅ |
| 33 | `fr_yandex_tracker_delete_attachment` | ISSUES | delete | false | true | true | ✅ | ✅ |
| 34 | `fr_yandex_tracker_delete_global_field` | ISSUES | delete | false | true | true | — | ✅ |
| 35 | `fr_yandex_tracker_delete_link` | ISSUES | delete | false | true | true | ✅ | ✅ |
| 36 | `fr_yandex_tracker_delete_worklog` | ISSUES | delete | false | true | true | — | ✅ |
| 37 | `fr_yandex_tracker_download_attachment` | ISSUES | attachments | false | false | true | ✅ | ✅ |
| 38 | `fr_yandex_tracker_find_issues` | ISSUES | read | true | false | true | ✅ | ✅ |
| 39 | `fr_yandex_tracker_get_attachments` | ISSUES | attachments | true | false | true | ✅ | ✅ |
| 40 | `fr_yandex_tracker_get_bulk_change_status` | ISSUES | bulk | true | false | true | — | — |
| 41 | `fr_yandex_tracker_get_filters` | ISSUES | read | true | false | true | — | ✅ |
| 42 | `fr_yandex_tracker_get_global_field` | ISSUES | read | true | false | true | — | ✅ |
| 43 | `fr_yandex_tracker_get_global_fields` | ISSUES | read | true | false | true | — | ✅ |
| 44 | `fr_yandex_tracker_get_issue_changelog` | ISSUES | read | true | false | true | ✅ | ✅ |
| 45 | `fr_yandex_tracker_get_issue_links` | ISSUES | links | true | false | true | ✅ | ✅ |
| 46 | `fr_yandex_tracker_get_issue_transitions` | ISSUES | workflow | true | false | true | ✅ | ✅ |
| 47 | `fr_yandex_tracker_get_issue_types` | ISSUES | read | true | false | true | — | ✅ |
| 48 | `fr_yandex_tracker_get_issues` | ISSUES | read | true | false | true | ✅ | ✅ |
| 49 | `fr_yandex_tracker_get_priorities` | ISSUES | read | true | false | true | — | ✅ |
| 50 | `fr_yandex_tracker_get_resolutions` | ISSUES | read | true | false | true | — | ✅ |
| 51 | `fr_yandex_tracker_get_statuses` | ISSUES | read | true | false | true | — | ✅ |
| 52 | `fr_yandex_tracker_get_thumbnail` | ISSUES | attachments | false | false | true | ✅ | ✅ |
| 53 | `fr_yandex_tracker_get_worklogs` | ISSUES | worklog | true | false | true | — | ✅ |
| 54 | `fr_yandex_tracker_search_worklog` | ISSUES | worklog | true | false | true | — | ✅ |
| 55 | `fr_yandex_tracker_transition_issue` | ISSUES | workflow | false | false | false | ✅ | ✅ |
| 56 | `fr_yandex_tracker_update_filter` | ISSUES | write | false | false | true | — | ✅ |
| 57 | `fr_yandex_tracker_update_global_field` | ISSUES | write | false | false | true | — | ✅ |
| 58 | `fr_yandex_tracker_update_issue` | ISSUES | write | false | false | true | ✅ | ✅ |
| 59 | `fr_yandex_tracker_update_worklog` | ISSUES | worklog | false | false | true | — | ✅ |
| 60 | `fr_yandex_tracker_upload_attachment` | ISSUES | attachments | false | false | false | ✅ | ✅ |
| 61 | `fr_yandex_tracker_add_goal_key_result` | PROJECTS | write | false | false | false | — | ✅ |
| 62 | `fr_yandex_tracker_clear_goal_key_results` | PROJECTS | write | false | true | true | — | ✅ |
| 63 | `fr_yandex_tracker_create_entity` | PROJECTS | write | false | false | false | — | ✅ |
| 64 | `fr_yandex_tracker_create_project` | PROJECTS | write | false | false | false | — | ✅ |
| 65 | `fr_yandex_tracker_delete_entity` | PROJECTS | delete | false | true | true | — | ✅ |
| 66 | `fr_yandex_tracker_delete_project` | PROJECTS | delete | false | true | true | — | ✅ |
| 67 | `fr_yandex_tracker_find_entities` | PROJECTS | read | true | false | true | — | ✅ |
| 68 | `fr_yandex_tracker_get_entity` | PROJECTS | read | true | false | true | — | ✅ |
| 69 | `fr_yandex_tracker_get_goal_key_results` | PROJECTS | read | true | false | true | — | ✅ |
| 70 | `fr_yandex_tracker_get_project` | PROJECTS | read | true | false | true | — | ✅ |
| 71 | `fr_yandex_tracker_get_projects` | PROJECTS | read | true | false | true | — | ✅ |
| 72 | `fr_yandex_tracker_set_goal_key_results` | PROJECTS | write | false | true | true | — | ✅ |
| 73 | `fr_yandex_tracker_update_entity` | PROJECTS | write | false | false | true | — | ✅ |
| 74 | `fr_yandex_tracker_update_project` | PROJECTS | write | false | false | true | — | ✅ |
| 75 | `fr_yandex_tracker_create_queue` | QUEUES | write | false | false | false | ✅ | ✅ |
| 76 | `fr_yandex_tracker_create_queue_local_field` | QUEUES | write | false | false | false | — | ✅ |
| 77 | `fr_yandex_tracker_get_queue` | QUEUES | read | true | false | true | ✅ | ✅ |
| 78 | `fr_yandex_tracker_get_queue_fields` | QUEUES | read | true | false | true | ✅ | ✅ |
| 79 | `fr_yandex_tracker_get_queue_local_fields` | QUEUES | read | true | false | true | — | ✅ |
| 80 | `fr_yandex_tracker_get_queues` | QUEUES | read | true | false | true | ✅ | ✅ |
| 81 | `fr_yandex_tracker_manage_queue_access` | QUEUES | write | false | false | true | ✅ | ✅ |
| 82 | `fr_yandex_tracker_update_queue` | QUEUES | write | false | false | true | ✅ | ✅ |
| 83 | `fr_yandex_tracker_update_queue_local_field` | QUEUES | write | false | false | true | — | ✅ |
| 84 | `fr_yandex_tracker_create_sprint` | SPRINTS | write | false | false | false | — | ✅ |
| 85 | `fr_yandex_tracker_get_sprint` | SPRINTS | read | true | false | true | — | ✅ |
| 86 | `fr_yandex_tracker_get_sprints` | SPRINTS | read | true | false | true | — | ✅ |
| 87 | `fr_yandex_tracker_manage_sprint_lifecycle` | SPRINTS | write | false | true | true | — | ✅ |
| 88 | `fr_yandex_tracker_update_sprint` | SPRINTS | write | false | false | true | — | ✅ |
| 89 | `fr_yandex_tracker_ping` | SYSTEM | health | true | false | true | — | ✅ |
| 90 | `fr_yandex_tracker_raw_api_request` | SYSTEM | read | true | false | true | — | ✅ |
| 91 | `fr_yandex_tracker_find_users` | USERS | read | true | false | true | — | ✅ |
| 92 | `fr_yandex_tracker_get_users` | USERS | read | true | false | true | — | ✅ |

## Производные списки (используются в этапах плана)

**Без интеграционного теста (59)** — материал этапа 2.3:

`fr_yandex_tracker_create_board`, `fr_yandex_tracker_create_board_column`, `fr_yandex_tracker_delete_board`, `fr_yandex_tracker_delete_board_column`, `fr_yandex_tracker_get_board`, `fr_yandex_tracker_get_board_columns`, `fr_yandex_tracker_get_boards`, `fr_yandex_tracker_update_board`, `fr_yandex_tracker_update_board_column`, `fr_yandex_tracker_demo`, `fr_yandex_tracker_get_issue_urls`, `fr_yandex_tracker_add_worklog`, `fr_yandex_tracker_analyze_issue_description`, `fr_yandex_tracker_bulk_move_issues`, `fr_yandex_tracker_bulk_transition_issues`, `fr_yandex_tracker_bulk_update_issues`, `fr_yandex_tracker_create_filter`, `fr_yandex_tracker_create_global_field`, `fr_yandex_tracker_delete_global_field`, `fr_yandex_tracker_delete_worklog`, `fr_yandex_tracker_get_bulk_change_status`, `fr_yandex_tracker_get_filters`, `fr_yandex_tracker_get_global_field`, `fr_yandex_tracker_get_global_fields`, `fr_yandex_tracker_get_issue_types`, `fr_yandex_tracker_get_priorities`, `fr_yandex_tracker_get_resolutions`, `fr_yandex_tracker_get_statuses`, `fr_yandex_tracker_get_worklogs`, `fr_yandex_tracker_search_worklog`, `fr_yandex_tracker_update_filter`, `fr_yandex_tracker_update_global_field`, `fr_yandex_tracker_update_worklog`, `fr_yandex_tracker_add_goal_key_result`, `fr_yandex_tracker_clear_goal_key_results`, `fr_yandex_tracker_create_entity`, `fr_yandex_tracker_create_project`, `fr_yandex_tracker_delete_entity`, `fr_yandex_tracker_delete_project`, `fr_yandex_tracker_find_entities`, `fr_yandex_tracker_get_entity`, `fr_yandex_tracker_get_goal_key_results`, `fr_yandex_tracker_get_project`, `fr_yandex_tracker_get_projects`, `fr_yandex_tracker_set_goal_key_results`, `fr_yandex_tracker_update_entity`, `fr_yandex_tracker_update_project`, `fr_yandex_tracker_create_queue_local_field`, `fr_yandex_tracker_get_queue_local_fields`, `fr_yandex_tracker_update_queue_local_field`, `fr_yandex_tracker_create_sprint`, `fr_yandex_tracker_get_sprint`, `fr_yandex_tracker_get_sprints`, `fr_yandex_tracker_manage_sprint_lifecycle`, `fr_yandex_tracker_update_sprint`, `fr_yandex_tracker_ping`, `fr_yandex_tracker_raw_api_request`, `fr_yandex_tracker_find_users`, `fr_yandex_tracker_get_users`

**Мутирующие (`readOnlyHint=false`, 52)** — материал этапов 3.1 (живой прогон) и К-3:

`fr_yandex_tracker_create_board`, `fr_yandex_tracker_create_board_column`, `fr_yandex_tracker_delete_board`, `fr_yandex_tracker_delete_board_column`, `fr_yandex_tracker_update_board`, `fr_yandex_tracker_update_board_column`, `fr_yandex_tracker_add_checklist_item`, `fr_yandex_tracker_delete_checklist_item`, `fr_yandex_tracker_update_checklist_item`, `fr_yandex_tracker_add_comment`, `fr_yandex_tracker_delete_comment`, `fr_yandex_tracker_edit_comment`, `fr_yandex_tracker_create_component`, `fr_yandex_tracker_delete_component`, `fr_yandex_tracker_update_component`, `fr_yandex_tracker_add_worklog`, `fr_yandex_tracker_bulk_move_issues`, `fr_yandex_tracker_bulk_transition_issues`, `fr_yandex_tracker_bulk_update_issues`, `fr_yandex_tracker_create_filter`, `fr_yandex_tracker_create_global_field`, `fr_yandex_tracker_create_issue`, `fr_yandex_tracker_create_link`, `fr_yandex_tracker_delete_attachment`, `fr_yandex_tracker_delete_global_field`, `fr_yandex_tracker_delete_link`, `fr_yandex_tracker_delete_worklog`, `fr_yandex_tracker_download_attachment`, `fr_yandex_tracker_get_thumbnail`, `fr_yandex_tracker_transition_issue`, `fr_yandex_tracker_update_filter`, `fr_yandex_tracker_update_global_field`, `fr_yandex_tracker_update_issue`, `fr_yandex_tracker_update_worklog`, `fr_yandex_tracker_upload_attachment`, `fr_yandex_tracker_add_goal_key_result`, `fr_yandex_tracker_clear_goal_key_results`, `fr_yandex_tracker_create_entity`, `fr_yandex_tracker_create_project`, `fr_yandex_tracker_delete_entity`, `fr_yandex_tracker_delete_project`, `fr_yandex_tracker_set_goal_key_results`, `fr_yandex_tracker_update_entity`, `fr_yandex_tracker_update_project`, `fr_yandex_tracker_create_queue`, `fr_yandex_tracker_create_queue_local_field`, `fr_yandex_tracker_manage_queue_access`, `fr_yandex_tracker_update_queue`, `fr_yandex_tracker_update_queue_local_field`, `fr_yandex_tracker_create_sprint`, `fr_yandex_tracker_manage_sprint_lifecycle`, `fr_yandex_tracker_update_sprint`

**Требующие явного согласия / деструктивные (14)** — материал проверки К-3 и раздела «безопасность» этапа 3.1:

`fr_yandex_tracker_delete_board`, `fr_yandex_tracker_delete_board_column`, `fr_yandex_tracker_delete_checklist_item`, `fr_yandex_tracker_delete_comment`, `fr_yandex_tracker_delete_component`, `fr_yandex_tracker_delete_attachment`, `fr_yandex_tracker_delete_global_field`, `fr_yandex_tracker_delete_link`, `fr_yandex_tracker_delete_worklog`, `fr_yandex_tracker_clear_goal_key_results`, `fr_yandex_tracker_delete_entity`, `fr_yandex_tracker_delete_project`, `fr_yandex_tracker_set_goal_key_results`, `fr_yandex_tracker_manage_sprint_lifecycle`

**Без unit-теста (3):** `fr_yandex_tracker_bulk_transition_issues`, `fr_yandex_tracker_bulk_update_issues`, `fr_yandex_tracker_get_bulk_change_status` — материал этапа 2.3, приоритет высокий (bulk меняет много задач разом).
