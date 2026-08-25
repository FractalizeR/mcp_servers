# Ссылки на легаси-семейство проектов `/v3/projects` (снято 2026-08-25)

Собрано агентом-разведчиком; таблицу построчно он записать не смог (read-only),
поэтому здесь сводка его отчёта. Перед исполнением удаления перечисление **снять
заново тем же способом** и сверить: унаследованный список воспроизводит пропуски
оригинала.

## Количества

- **Удалить целиком: 55 файлов** — `src/tools/api/projects/**` (17),
  `src/tracker_api/api_operations/project/**` (7, включая `pin-projects-link.util.ts`),
  `src/tracker_api/dto/project/**` (8), `entities/project.entity.ts`,
  `src/resources/project-resource-provider.ts`,
  `facade/services/project.service.ts`, `tests/tools/api/projects/**` (5),
  `tests/integration/tools/api/projects/**` (5),
  `tests/tracker_api/api_operations/project/**` (6),
  `tests/resources/project-resource-provider.test.ts`,
  `tests/helpers/project.fixture.ts`, `tests/helpers/project-dto.fixture.ts`,
  `tests/tools/api/entities/entity-vs-legacy-project.contract.test.ts`.
- **Править точечно: 52 файла** — DI и реестры (`tool-definitions`,
  `operation-definitions`, `facade-services`, `project-agile-services.container`,
  фасад, barrel-индексы), ресурсы и промпты (`resources/index`,
  `tracker-resource-uri`, `apps-ui-uri`, `prompts/project-summary.prompt`,
  `tracker-prompt-provider`, `server.ts`), рубеж прогона (`live-scope.guard`,
  `organization-rules`, `run-journal`, `request-path` + шесть тестов),
  строковые идентификаторы (`cursor-codec.util` — тег `projects: 'proj'`,
  `coverage-exceptions/live-exempt-categories`), документация (README, CLAUDE.md
  пакета, три README модулей, TESTING_STRATEGY, COVERAGE_MATRIX,
  `manifest.template.json`), артефакты и скрипты, смок- и wire-тесты, а также
  `packages/framework/dev-client/docs/tools-annotations-inventory.md`.

## Где легаси и Entity API переплетены

1. **`ToolCategory.PROJECTS`** (`packages/framework/core/.../tool-metadata.ts`) —
   одно значение на легаси-проекты И на все девять инструментов Entity API.
   Управляет `DISABLED_TOOL_GROUPS`; в `manifest.template.json` группа `projects`
   **уже отключена по умолчанию**, то есть под профилем MCPB сейчас скрыты и
   легаси, и весь Entity API разом. После удаления легаси имя категории станет
   вводящим в заблуждение — либо переименовать, либо явно решить, что `projects`
   теперь значит Entity API.
2. **`ProjectAgileServicesContainer`** — общий с Board/Sprint/BulkChange/BoardColumn:
   удаляется конструктор и импорт `ProjectService`, не файл.
3. **`entity-vs-legacy-project.contract.test.ts`** — существует только чтобы держать
   разделение; после удаления легаси сравнивать не с чем.
4. **`entities/entity-api.entity.ts`** — doc-comment объясняет разницу «legacy Project
   vs EntityApiRecord(project)», ссылается на существующие инструменты.
5. **`prompts/project-summary.prompt.ts`** — промпт построен вокруг `get_project`;
   нужен перевод на Entity API либо удаление промпта.

## Чем получено и чего этот способ не видит

**Применено:** `grep`, `find`, чтение файлов. **MCP Serena агенту оказался
недоступен** — требование задания не выполнено, поиск по символам сделан текстовым
grep по именам классов и констант.

**Непокрытые каналы:** переэкспорт с переименованием (`export { X as Y }`);
динамическое построение имени инструмента (не литералом); ссылки на уровне типов без
слова `project` в идентификаторе; непрямые импорты в обход barrel; граф импортов не
строился инструментом (`tsc`/`ts-morph`/`madge`) — только вручную по `index.ts`.
Сознательно исключены: `.claude/worktrees/**` (три параллельные копии со своими
README и планами — попадут в счёт при их мерже) и `.agentic-planning/**` вне
текущего плана (журналы закрытых задач не переписываются задним числом).
