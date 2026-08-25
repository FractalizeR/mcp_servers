# Инвентарь: annotations всех tool-метаданных двух серверов

Постоянное место инвентаря (перенесено из `.agentic-planning/plan_mcp_dev_interface/inventory_tools_annotations.md`
пакетом 1.3 плана dev-интерфейса вызова MCP-инструментов). Причина переноса: правила проекта
требуют удалить папку плана после финальной валидации, а верификационный артефакт, на который
опирается защита записи `mcp-dev` (`packages/framework/dev-client/src/write-policy/`), не должен
умирать вместе с планом.

**Статус: подтверждён.** Наличие хинтов проверено тремя независимыми способами (см. ниже), и для
каждого инструмента с `readOnlyHint: true` проведена ручная сверка по коду — он не пишет ни в
удалённое окружение, ни на локальную ФС. Единственное известное расхождение (`yandex-wiki /
download_attachment`) на момент верификации уже устранено в коде (коммит `6a19b7ad`) — см. раздел
«Семантическая сверка» ниже.

## Чем получено и чего каждый способ не видит

Три независимых канала, каждый закрывает слепые пятна предыдущего:

1. **Статический regex-парс `*.metadata.ts`** (пакет 1, запуск 2026-08-19 в worktree
   `mcp-tools-dev-interface-577f72`). Быстрый, не требует сборки/подключения. **Не видит:**
   (а) дефолты annotations — их на деле нет: `BaseTool.getDefinition()`
   (`packages/framework/core/src/tools/base/base-tool.ts`) копирует `metadata.annotations` как
   есть и ничего не подставляет, если поле отсутствует; (б) инструменты, чьи метаданные объявлены
   не в `*.metadata.ts`; (в) инструменты, для которых файл метаданных существует, но класс тула не
   зарегистрирован в `TOOL_CLASSES` composition root (и наоборот — регистрация без файла);
   (г) переопределение annotations в рантайме.
2. **Реальный `tools/list` через `mcp-dev list --json`** (пакет 1.3) — тот же протокол, которым
   инструмент увидит MCP-клиент. Снят по tracker и wiki:
   `node packages/framework/dev-client/dist/cli/bin/mcp-dev.js list --json --server-name
   fractalizer_mcp_yandex_tracker --package-dir packages/servers/yandex-tracker` (аналогично для
   wiki). Закрывает слепые пятна (а)-(в) статического парса: это то, что клиент получит на самом
   деле. **Не видит:** переопределение annotations в рантайме
   на основании входных аргументов конкретного вызова (annotations в MCP статичны на уровне
   definition, так что этот случай архитектурно исключён, а не просто не проверен).
3. **Семантическая сверка по коду** (пакет 1.3) — для каждого инструмента с `readOnlyHint: true`
   прослежена цепочка `*.tool.ts` → `facade.*` → `*.service.ts` → `*.operation.ts` до конкретного
   `httpClient.<verb>`, плюс grep на `writeFile`/`createWriteStream`/`writeFileSync` по
   каталогам `tools/` обоих серверов. Закрывает то, что не видят каналы 1-2: значение хинта
   может быть синтаксически корректным, но семантически неверным (хинт есть, факт не
   соответствует). **Не видит:** поведение, зависящее от значений аргументов вызова (например,
   гипотетический инструмент, который пишет на диск только при определённом параметре) — сверка
   статическая, по исходному коду, а не по трассировке рантайма; также не видит сторонние эффекты
   за пределами `httpClient`/`fs` (например, запись в кэш-файл через сторонний SDK, если такой
   появится).

**Итого файлов метаданных:** 128 (tracker 92, wiki 36) — подтверждено всеми тремя
каналами; `mcp-dev list --json` вернул ровно 92 и 36 записей для tracker и wiki соответственно
(канал 2), совпадает со статическим парсом (канал 1) и с `TOOL_CLASSES.length` каждого сервера
(проверяется регрессионным тестом `tests/composition-root/annotations.test.ts` /
`tests/unit/composition-root/annotations.test.ts` — 93/37 тестов = N инструментов + 1 проверка
непустоты списка).

## Семантическая сверка read-only инструментов

Для каждого сервера ниже перечислены все инструменты с `readOnlyHint: true` (по факту — по
реальному `tools/list`) и результат
проверки: не пишут ни в удалённое окружение (нет вызовов `httpClient.post/postWithResponse/patch/
put/delete`), ни на локальную ФС (нет `writeFile`/`createWriteStream`/`writeFileSync`).

- **yandex-tracker** (38 инструментов; было 40 до удаления легаси-семейства проектов
  `get_project`/`get_projects` 2026-08-25 — данные проектов теперь только через
  `get_entity`/`find_entities`, уже в списке): `analyze_issue_description`, `demo`,
  `find_entities`, `find_issues`, `find_users`, `get_attachments`, `get_board`,
  `get_board_columns`, `get_boards`, `get_bulk_change_status`, `get_checklist`, `get_comments`,
  `get_components`, `get_entity`, `get_filters`, `get_global_field`, `get_global_fields`,
  `get_goal_key_results`, `get_issue_changelog`, `get_issue_links`, `get_issue_transitions`,
  `get_issue_types`, `get_issue_urls`, `get_issues`, `get_priorities`, `get_queue`,
  `get_queue_fields`, `get_queue_local_fields`, `get_queues`, `get_resolutions`, `get_sprint`,
  `get_sprints`, `get_statuses`, `get_users`, `get_worklogs`, `ping`, `raw_api_request`,
  `search_worklog` — все делегируют через `facade.*` → `*.service.ts` к операциям на
  `httpClient.get`/`getWithResponse`; ни один сервис-класс на пути этих 38 инструментов не
  содержит `httpClient.post/patch/put/delete`; ни один файл в `tools/` не содержит `writeFile`.
  `raw_api_request` дополнительно заперт на уровне схемы (`method: z.literal('GET')`) и в
  операции (`switch(method) { case 'GET': ...; default: throw }`) — расширение на другие методы
  требует правки схемы и добавления ветки, случайно не произойдёт.
- **yandex-wiki** (12 инструментов): `diff_page`, `get_comment_thread`, `get_comments`,
  `get_descendants`, `get_descendants_by_id`, `get_grid`, `get_page`, `get_page_by_id`,
  `get_resources`, `ping`, `raw_api_request`, `search` — та же проверка, тот же результат: только
  `httpClient.get`, `raw_api_request` заперт на GET аналогично tracker.

**Не найдено ни одного действующего расхождения.** Единственный известный кандидат —
`yandex-wiki / download_attachment` — на момент верификации (2026-08-19) уже исправлен в коде:
`readOnlyHint: false` в
`packages/servers/yandex-wiki/src/tools/api/attachments/download/download-attachment.metadata.ts`
(коммит `6a19b7ad fix(wiki): download_attachment помечен readOnlyHint: false`), синхронизирован с
`yandex-tracker` (`download_attachment`, `get_thumbnail` — оба `false`, правка «пакет 3.1.G»).
Реальный `tools/list` подтверждает: `yw_download_attachment` → `readOnly: false`, `class: "write"`.
Независимо от значения `readOnlyHint`, dev-client классифицирует `download_attachment` в tracker/
wiki как минимум `local-side-effect` по
наличию аргумента `saveToPath` в схеме — см. `hasPathLikeProperty()` в
`packages/framework/dev-client/src/write-policy/classify.ts`. Это независимый механизм защиты,
не полагающийся на корректность `readOnlyHint` — правка на будущее не станет единственной линией
обороны.

## Регрессионный тест

Каждый сервер имеет безусловный тест, проверяющий, что **все** зарегистрированные в
`TOOL_CLASSES` инструменты объявляют `annotations.readOnlyHint`/`destructiveHint` явными
булевыми значениями (а не оставляют поле `undefined`):

- `packages/servers/yandex-tracker/tests/composition-root/annotations.test.ts`
- `packages/servers/yandex-wiki/tests/unit/composition-root/annotations.test.ts`

Тест итерирует по `TOOL_CLASSES` (не по списку заранее известных имён), поэтому новый инструмент
без явных хинтов роняет сборку сервера при первом же `npm test`. Проверено эмпирически: временное
удаление блока `annotations` из `get-issues.metadata.ts` (tracker) дало красный тест с сообщением
`fr_yandex_tracker_get_issues: METADATA.annotations не задан`, после отката — снова зелёный.

## Полная таблица (по состоянию static-парса; readOnly/destructive совпадают с реальным
## `tools/list` для tracker и wiki — см. раздел «Семантическая сверка» выше)

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
| yandex-wiki | download_attachment | false | false | true | true | download-attachment.metadata.ts |
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

## Сводка

- **yandex-tracker**: 92 tools; readOnlyHint: {'true': 40, 'false': 52}; destructiveHint: {'false': 78, 'true': 14}
- **yandex-wiki**: 36 tools; readOnlyHint: {'true': 12, 'false': 24}; destructiveHint: {'false': 26, 'true': 10}
  (было 13/23 в предварительной версии — `download_attachment` перешёл из `true` в `false`, см.
  «Семантическая сверка»)

- **Без явных readOnly/destructive:** 0 (подтверждено регрессионным тестом на 128 инструментах)
