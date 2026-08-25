# Инвентарь ссылок на `delete_component` и `delete_global_field`

Снято: 2026-08-25, только чтение, код не менялся. Пакет `packages/servers/yandex-tracker`.
Причина удаления (контекст задачи, не перепроверялось здесь повторно): `DELETE /v3/components/{id}`
и `DELETE /v3/fields/{id}` не задокументированы ни справочником Трекера, ни `yandex_tracker_client/`
— оба выведены из общей механики `Collection.delete()` базового класса submodule.

Все пути — относительно `packages/servers/yandex-tracker/`, если не указано иное.

---

## 1. Таблица: файл : строки : канал : что ссылается : действие

| # | Файл | Строки | Канал | Что ссылается | Действие |
|---|---|---|---|---|---|
| 1 | `src/tools/api/components/delete-component.tool.ts` | 1-54 | tool | `DeleteComponentTool` | удалить целиком |
| 2 | `src/tools/api/components/delete-component.schema.ts` | 1-35 | schema | `DeleteComponentParamsSchema`, `DeleteComponentOutputSchema` | удалить целиком |
| 3 | `src/tools/api/components/delete-component.metadata.ts` | 1-37 | metadata | `DELETE_COMPONENT_TOOL_METADATA`, имя `delete_component`, теги | удалить целиком |
| 4 | `src/tools/api/fields/delete-global-field.tool.ts` | 1-41 | tool | `DeleteGlobalFieldTool` | удалить целиком |
| 5 | `src/tools/api/fields/delete-global-field.schema.ts` | 1-24 | schema | `DeleteGlobalFieldParamsSchema`, `DeleteGlobalFieldOutputSchema` | удалить целиком |
| 6 | `src/tools/api/fields/delete-global-field.metadata.ts` | 1-28 | metadata | `DELETE_GLOBAL_FIELD_TOOL_METADATA`, имя `delete_global_field`, теги | удалить целиком |
| 7 | `src/tracker_api/api_operations/component/delete-component.operation.ts` | 1-90 | operation | `DeleteComponentOperation`, инлайновый `GET /v3/components/{id}` перед DELETE | удалить целиком |
| 8 | `src/tracker_api/api_operations/field/delete-field.operation.ts` | 1-50 | operation | `DeleteFieldOperation` | удалить целиком |
| 9 | `tests/tools/api/components/delete-component.tool.test.ts` | 1-269 | unit-тест tool | `DeleteComponentTool` | удалить целиком |
| 10 | `tests/tools/api/fields/delete-global-field.tool.test.ts` | 1-45 | unit-тест tool | `DeleteGlobalFieldTool` | удалить целиком |
| 11 | `tests/tracker_api/api_operations/component/delete-component.operation.test.ts` | 1-179 | unit-тест operation | `DeleteComponentOperation` | удалить целиком |
| 12 | `tests/integration/tools/api/components/delete/delete-component.tool.integration.test.ts` | 1-102 | integration-тест | `fr_yandex_tracker_delete_component`, GET→DELETE поток | удалить целиком (+ удалить опустевший каталог `.../components/delete/`) |
| 13 | `tests/integration/tools/api/fields/delete-global-field.tool.integration.test.ts` | 1-78 | integration-тест | `fr_yandex_tracker_delete_global_field` | удалить целиком (каталог `.../fields/` не опустеет — там ещё 4 файла) |
| 14 | `src/tools/api/components/index.ts` | 24-28 | index-реэкспорт | `DeleteComponentTool`, `DeleteComponentParamsSchema` | править точечно (удалить блок) |
| 15 | `src/tools/api/fields/index.ts` | 30-34 | index-реэкспорт | `DeleteGlobalFieldTool`, `DeleteGlobalFieldParamsSchema` | править точечно (удалить блок) |
| 16 | `src/tracker_api/api_operations/component/index.ts` | 8 | index-реэкспорт | `DeleteComponentOperation` | править точечно (удалить строку) |
| 17 | `src/tracker_api/api_operations/field/index.ts` | 9 | index-реэкспорт | `DeleteFieldOperation` | править точечно (удалить строку) |
| 18 | `src/tracker_api/facade/services/component.service.ts` | 24, 36, 89-91 | сервис | импорт `DeleteComponentOperation`, DI-параметр, метод `deleteComponent()` | править точечно |
| 19 | `src/tracker_api/facade/services/field.service.ts` | 26, 41, 84-86 | сервис | импорт `DeleteFieldOperation`, DI-параметр, метод `deleteField()` | править точечно |
| 20 | `src/tracker_api/facade/yandex-tracker.facade.ts` | 424-425, 1013-1014 | facade | методы `deleteComponent()`, `deleteField()` (делегирование в сервисы) | править точечно |
| 21 | `src/tracker_api/facade/README.md` | 50, 54 | README компонента | перечни методов сервисов упоминают `deleteComponent()`/`deleteField()` | править точечно |
| 22 | `src/tracker_api/api_operations/README.md` | 470-489 | README компонента | раздел «4 операции для работы с компонентами», подраздел «4. DeleteComponentOperation» | править точечно (снять подраздел, «4 операции» → «3 операции»; раздела про Field Operations в файле вообще нет — не канал) |
| 23 | `src/composition-root/definitions/tool-definitions.ts` | 27-32, 118-122, 152-156, 233-237 | composition-root | импорт `DeleteComponentTool`/`DeleteGlobalFieldTool`, 2 записи в массиве `TOOL_CLASSES` | править точечно |
| 24 | `src/composition-root/definitions/operation-definitions.ts` | 28-33, 78-83, 155-161, 190-195 | composition-root | импорт `DeleteComponentOperation`/`DeleteFieldOperation`, 2 записи в массиве операций | править точечно |
| 25 | `README.md` (пакет) | 269-276 | документация пользователя | строка `fr_yandex_tracker_delete_component`, заголовок «Components (4 инструмента)» → 3; секции про Global Fields в файле нет вообще (см. §2 «слепые пятна») | править точечно |
| 26 | `CLAUDE.md` (пакет) | 576 | документация пользователя | «Список инструментов (92 штуки)» — итоговый счётчик | править точечно (92 → 90) |
| 27 | `CLAUDE.md` (пакет) §5.1 | ~336-346 | политика инструментов удаления | список сущностей без delete-инструмента (очередь/фильтр/локальное поле/задача) НЕ упоминает компонент и глобальное поле — после удаления они присоединяются к этому списку по факту | рекомендовано дополнить (спорный случай, см. §3) |
| 28 | `tests/README.md` | 244 | тестовая документация | `delete_component` — пример многоступенчатого потока GET→DELETE | править точечно (убрать из перечня примеров, `download_attachment`/`get_thumbnail`/`transition_issue` остаются) |
| 29 | `tests/COVERAGE_MATRIX.md` | 107, 120 | сгенерированный отчёт | строки-клетки `delete_component`, `delete_global_field` | НЕ редактировать руками — перегенерировать `npm run coverage:matrix` |
| 30 | `scripts/build-coverage-matrix.ts` | 58, 287, 572 | генератор + его комментарии | `delete_component` как пример многоступенчатого теста без фабрики | править точечно (убрать `delete_component` из трёх перечней-примеров в комментариях; `download_attachment`/`get_thumbnail`/`transition_issue` остаются) |
| 31 | `doc-route-sweep.md` | 15-16, 19 | сгенерированный отчёт | 3 строки таблицы «маршруты вне документации» с `delete_component`/`delete_global_field` | НЕ редактировать руками — перегенерировать `npm run sweep:doc-routes` |
| 32 | `outgoing-requests.md` | 35-36, 101 | сгенерированный отчёт | 3 строки таблицы исходящих запросов | НЕ редактировать руками — перегенерировать `npm run enumerate:requests` |
| 33 | `tests/coverage-exceptions/legacy-mock-tests.ts` | 56 (путь в `LEGACY_MOCK_TEST_PATHS`), 76 (`LEGACY_MOCK_TEST_BASELINE_COUNT = 33`) | храповик тестового реестра | путь к `delete-component.tool.integration.test.ts`, счётчик 33 | править точечно: удалить строку пути **и** уменьшить `LEGACY_MOCK_TEST_BASELINE_COUNT` до 32 (иначе `validateLegacyMockTestList` роняет `coverage:check` — барьер 1 и барьер 2 сразу). `delete-global-field` в этом перечне не числится (тест уже на фабрике) — второй правки здесь не требуется |
| 34 | `tests/live_scope/known-mutating-requests.ts` | 190, 204-209, 311-316 | правила живого прогона (тестовые фикстуры) | комментарий «Класс A' … (6 запросов)», объекты `{ tool: 'delete_component', ... }` и `{ tool: 'delete_global_field', ... }` | править точечно: удалить оба объекта, поправить «(6 запросов)» → «(5 запросов)» (счётчик относится только к блоку класса A', блок с `delete_global_field` без числового комментария) |
| 35 | `tests/live_scope/known-mutating-requests.ts` | 36, 54 | правила живого прогона | константы `SANDBOX_COMPONENT`, `SANDBOX_GLOBAL_FIELD` | НЕ трогать — используются записями `update_component`/`update_component` и `update_global_field`, которые остаются |
| 36 | `tests/live_scope/run-fixture.ts` | 34, 42 | правила живого прогона | `journal.register('component', SANDBOX_COMPONENT)`, `journal.register('globalField', SANDBOX_GLOBAL_FIELD)` | НЕ трогать — журнал нужен и для update/create той же сущности |
| 37 | `src/live_scope/sandbox-queue-rules.ts` | 212-241 | правило рубежа (владение компонентом) | правило `POST /v3/components` (создание) и `/^\/v[23]\/components\/([^/?]+)\/?$/` с `methods: 'any'` (правка/удаление/чтение) | НЕ трогать — правило общее для create/update/delete по одному и тому же пути; ветка DELETE в нём просто станет недостижимой снаружи (ни один инструмент её больше не вызовет), но само правило обязано остаться fail-closed для гипотетических запросов |
| 38 | `src/live_scope/organization-rules.ts` | 331-338 | правило рубежа (владение глобальным полем) | `orgFamilyRules({ kind: 'globalField', editPattern: /^\/v3\/fields\/([^/?]+)\/?$/, ... })`, `editMethods` не задан → по умолчанию `'any'` (PATCH и DELETE) | НЕ трогать — тот же метод обслуживает `update_global_field`; см. п. «что осиротеет» |
| 39 | `tests/live_scope/organization-rules.test.ts`, `tests/live_scope/scope-rules.test.ts` | несколько (напр. `scope-rules.test.ts:119,158`; `organization-rules.test.ts:268`) | тесты правил рубежа | синтетические запросы `method:'delete', path:'/v3/components/...'` — проверяют поведение guard'а по пути/методу, не привязаны к существованию инструмента | НЕ трогать — это тесты защитного правила на уровне пути/метода, они и раньше не ссылались на конкретный tool-класс |
| 40 | `tests/coverage-exceptions/legacy-mock-tests.test.ts` | — | самотест барьеров | использует синтетические временные файлы, не боевой список | НЕ трогать |
| 41 | `tests/smoke/tool-contract-3-1-c.smoke.test.ts` | 48-50, 87 | smoke-тест, жёсткий счётчик | `TOOL_CLASSES.length` / `definitions.length` / `listEntries.length` захардкожены на `92`, заголовок теста «ровно 92 инструмента» | править точечно: 92 → 90 в четырёх местах (включая текст названия теста) |
| 42 | `tests/tracker_api/facade/yandex-tracker.facade.test.ts` | 68, 130, 776-785 | unit-тест facade | mock-заглушки `deleteField: vi.fn()` / `deleteComponent: vi.fn()`, блок `describe('deleteField', ...)` с явной проверкой делегирования | править точечно: убрать обе заглушки и блок `describe('deleteField', ...)`. Блока `describe('deleteComponent', ...)` в файле не было (делегирование `deleteComponent` не тестировалось отдельно) |
| 43 | `tests/tracker_api/facade/yandex-tracker.facade.batch.test.ts` | 59, 131 | unit-тест facade (batch) | те же mock-заглушки `deleteField`/`deleteComponent` в объекте-моке контейнера | править точечно: убрать обе строки |
| 44 | `tests/integration/helpers/tool-integration-suite.ts` | 28, 79 | тестовая инфраструктура (комментарии) | `delete_component` в перечне примеров многоступенчатых тестов вне фабрики | править точечно (убрать из перечня, `transition_issue`/`download_attachment`/`get_thumbnail` остаются) |
| 45 | `tests/integration/helpers/api-expectation.ts` | 15 | тестовая инфраструктура (комментарий) | «порядок ожиданий значим (delete_component: GET → DELETE; transition_issue: …)» | править точечно (убрать пример `delete_component` из комментария, оставить `transition_issue`) |
| 46 | `.agentic-planning/**` (15 файлов, перечислены ниже) | — | исторические планы/отчёты | упоминания `delete_component`/`delete_global_field` как уже реализованных инструментов на момент написания | НЕ трогать — это исторические записи прошлых этапов (журнал решений), не живая документация; правка исказила бы историю. Список файлов см. §2 |

### Файлы `.agentic-planning/**`, где встречаются идентификаторы (исторические, не редактировать)

`plan_tracker_tool_fixes/3.5_descriptions_table.md`,
`plan_tracker_fix_create_tools/3.2_LIVE_RUN_REPORT_2026-08-25b.md`,
`plan_tracker_fix_create_tools/2.4_global_field_parallel.md`,
`plan_tracker_fix_create_tools/enumeration.md`,
`plan_tracker_fix_create_tools/4_ROUTE_SWEEP_2026-08-25.md`,
`plan_tracker_fix_create_tools/3.1_live_acceptance_sequential.md`,
`plan_mcp_2026_modernization/inventory/table2-tools-matrix.tsv`,
`plan_mcp_2026_modernization/inventory/table4-tracker-api-coverage.md`,
`plan_tracker_test_coverage/0_outgoing_requests.md`,
`plan_tracker_test_coverage/5.2_org_live_acceptance_sequential.md`,
`plan_tracker_test_coverage/README.md`,
`plan_tracker_test_coverage/inventory/mutating-tools-2026-08-25.md`,
`plan_tracker_test_coverage/inventory/tools-coverage-2026-08-20.md`,
`plan_tracker_test_coverage/2.1.1_matrix_and_harness_sequential.md`,
`plan_tracker_test_coverage/2.1.2_category_packages_parallel.md`,
`plan_tracker_test_coverage/inventory/v2-paths-2026-08-24.md`.

---

## 2. Чем получено и чего этот способ не видит

**Инструменты:** `grep -rn`/`find` по пакету (`Bash`), точечное чтение файлов (`Read`).
**MCP Serena для символов, запрошенный заданием, в этой среде НЕДОСТУПЕН** (отсутствует в списке
инструментов сессии и не подгружается через `ToolSearch`) — весь поиск сделан текстовым grep по
идентификаторам (`delete_component`, `delete-component`, `DeleteComponentOperation`,
`deleteComponent`, аналогично для field/global-field) плюс ручная проверка мест использования DI
(imports, конструкторы, index-реэкспорты). Это следует держать в уме как метод замены symbol-search.

**Непокрытые grep'ом каналы (явно):**
- **Скомпилированные артефакты (`dist/`, если существуют)** — не проверялись; при сборке они
  перегенерируются, поэтому не являются самостоятельным источником правды, но при наличии
  устаревшего `dist/` в репозитории (не должно быть в git) могли бы дать ложные совпадения —
  не проверено, что такого каталога нет в git-дереве.
- **`coverage/` и `coverage/lcov-report/` HTML/JSON** — совпадения найдены (перечислены в grep-выводах
  выше), но это артефакты последнего прогона `npm run test:coverage`, перегенерируются сами —
  не самостоятельный канал, в таблицу не включены отдельными строками.
- **git history / другие ветки** — не проверялись; поиск шёл только по рабочему дереву текущей ветки.
- **manifest.json / manifest.template.json** — проверены на прямые совпадения (не найдено); но
  `manifest.json` — производный артефакт (`.gitignore`, генерируется `build:mcpb`), а
  `manifest.template.json` не перечисляет инструменты поимённо — оба канала пустые, но не
  гарантировано, что будущая ручная правка `manifest.template.json` не появится где-то ещё.
- **package.json (scripts/dev-calls примеры), `dev-calls.example.jsonl`** — проверены точечно
  через grep по `deleteComponent\|deleteField` в `src/cli` и `scripts/`, совпадений нет; сам
  `dev-calls.example.jsonl` (упомянут в CLAUDE.md §дев-интерфейс) не проверялся построчно на
  наличие вызовов `delete_component`/`delete_global_field` — по описанию в CLAUDE.md он содержит
  только 3 read-инструмента (ping, find_issues, get_users), поэтому вероятность низкая, но файл не
  открывался.
- **`.agentic-planning/` за пределами перечисленных 15 файлов** — поиск делался только по
  buildin-подстрокам `delete_component`/`delete_global_field`; упоминания под другими формами
  (например, только `DELETE /v3/components` без имени инструмента) могли остаться незамеченными.
- **README.md пакета не документирует `delete_global_field` вообще** (раздел «Global Fields»
  в детальном списке инструментов отсутствует как класс) — это не пропуск данного поиска, а
  предсуществующий пробел документации, зафиксирован как факт, не как канал для правки.
- **Общий счётчик README.md «Поддерживаемые API (42 инструмента)»** (строка 177) не совпадает ни
  с текущим числом инструментов (92 по `CLAUDE.md`/smoke-тесту), ни с числом после удаления (90) —
  уже расходится с фактом независимо от этой задачи; не включён в таблицу как канал этой задачи,
  но исправление (42 → правильное число) требует отдельного решения, не входящего в scope.
- **`tests/live_scope/known-mutating-requests.ts:6`** — комментарий «Снято на 92 инструментах: 80
  запросов, из них 50 не-GET» описывает конкретный исторический прогон (снимок на дату), не текущий
  инвариант; решено НЕ считать его каналом для правки (см. «спорные случаи» ниже), но это решение
  сделано мной единолично и может быть пересмотрено.

---

## 3. Что осиротеет (важно для knip)

- **Символы, удаляемые вместе с файлами** (не осиротевшие, а исчезающие целиком — knip их не
  увидит вовсе, если файлы физически удалены): `DeleteComponentTool`, `DeleteComponentParamsSchema`,
  `DeleteComponentOutputSchema`, `DELETE_COMPONENT_TOOL_METADATA`, `DeleteComponentOperation`,
  `DeleteGlobalFieldTool`, `DeleteGlobalFieldParamsSchema`, `DeleteGlobalFieldOutputSchema`,
  `DELETE_GLOBAL_FIELD_TOOL_METADATA`, `DeleteFieldOperation`.
- **Реальный риск для knip — не удалённые символы, а оставшиеся ссылки на них**, если правки из
  §1 (пункты 14-24) сделаны не полностью: неудалённый импорт `DeleteComponentOperation` в
  `component.service.ts` или неудалённая строка в `tool-definitions.ts`/`operation-definitions.ts`
  после удаления самого файла — это не knip-проблема (будет TS-ошибка компиляции, упадёт раньше
  knip), поэтому фактического риска «тихого» knip-предупреждения тут нет: любой пропущенный
  импорт ломает сборку явно.
- **GET-хелпер внутри `delete-component.operation.ts` не осиротеет отдельно** — это не вынесенный
  переиспользуемый метод, а инлайновый вызов `this.httpClient.get<ComponentOutput>(...)` внутри
  `execute()` того же класса, который удаляется целиком. Отдельного `GetComponentOperation`
  (единичное чтение компонента) в кодовой базе нет — есть только `GetComponentsOperation`
  (список). Значит, у GET из `delete_component` нет разделяемого хелпера, который остался бы без
  вызывающих после удаления — ничего не осиротевает.
- **`ComponentOutput` (тип из `#tracker_api/dto`)** использовался в `delete-component.operation.ts`
  для типизации ответа GET — остаётся использоваться в `create-component.operation.ts`,
  `update-component.operation.ts`, `component.service.ts`. Не осиротеет.
- **`EntityType.COMPONENT` / `EntityType.FIELD`** (enum значения `@fractalizer/mcp-infrastructure`)
  использовались в удаляемых операциях для ключей кеша — остаются нужны `create/update/get`
  операциям тех же семейств. Не осиротеют.
- **`SANDBOX_COMPONENT`, `SANDBOX_GLOBAL_FIELD`** (константы `known-mutating-requests.ts`) — не
  осиротеют: используются записями `update_component`/`update_global_field`, которые остаются.
- **`RunJournal`-роды `'component'`/`'globalField'`** (`run-journal.ts`) — не осиротеют: журнал
  нужен и для create/update той же сущности (владение проверяется по journal, не по delete).
- **Live-scope правило `/^\/v[23]\/components\/([^/?]+)\/?$/` (methods: 'any')** — после удаления
  `delete_component` эта ветка правила по факту не получает DELETE-запросов ни от одного
  инструмента (только PATCH от `update_component`), но само правило НЕ осиротевает как код —
  оно продолжает быть частью fail-closed защиты на случай прямого/непредвиденного запроса. Отмечаю
  как «функционально сузившееся, но не мёртвое» — не требует правки.
- **Live-scope правило `orgFamilyRules({ kind: 'globalField', ... })` без явного `editMethods`**
  — аналогично: DELETE-ветка перестаёт вызываться живым инструментом, PATCH-ветка (`update_global_field`)
  остаётся. Код не осиротевает.
- **`tests/coverage-exceptions/legacy-mock-tests.ts`** — если строку пути удалить, но НЕ уменьшить
  `LEGACY_MOCK_TEST_BASELINE_COUNT`, барьер 1 (`paths.size !== baselineCount`) уронит
  `coverage:check` явной ошибкой — это не knip, но это тот самый «падает валидация», о котором
  предупреждает задание; технически не knip, а собственный храповик пакета, требует синхронной
  правки счётчика и перечня.
- **Опустевший каталог `tests/integration/tools/api/components/delete/`** — не Python/TS-символ,
  но пустой каталог в git не хранится сам по себе; после удаления единственного файла в нём
  каталог следует удалить как часть операции (иначе он просто исчезнет автоматически при `git rm`
  последнего файла — отдельного действия не требуется, git не отслеживает пустые каталоги).

**Итог по осиротевшим символам: 0** обнаружено — оба удаляемых семейства (component/field delete)
не имеют самостоятельно используемых снаружи хелперов, кроме собственных экспортов, которые
исчезают вместе с файлами. Риск для knip — не осиротевшие экспорты, а недоудалённые
ссылки/реэкспорты (пункты 14-17, 23-24 таблицы), которые в норме ловятся раньше knip
компилятором TypeScript.

---

## 4. Спорные случаи (решены самостоятельно, см. границы самостоятельности)

1. **CLAUDE.md §5.1** — политика явно перечисляет очередь/фильтр/локальное поле/задачу, но не
   компонент и не глобальное поле. Решение: рекомендовать дополнение (не обязательная правка, а
   документационное решение продукта — не блокирует техническое удаление). Отмечено как
   «рекомендовано», не «обязательно».
2. **`known-mutating-requests.ts:6`** («Снято на 92 инструментах…») — оставлено как исторический
   снимок, не текущий инвариант. Не включено в обязательные правки.
3. **README.md «(42 инструмента)»** — расхождение с фактом существует независимо от этой задачи
   (уже не совпадает ни с 92, ни с 90). Не входит в scope удаления двух инструментов, отмечено
   как отдельная предсуществующая проблема.
4. **Правила `live_scope`** (пп. 37-39 таблицы) — методы `'any'` в правилах остаются нетронутыми,
   так как обслуживают ещё живые PATCH-операции (`update_component`, `update_global_field`); я
   расцениваю недостижимую DELETE-ветку как приемлемый защитный избыток (fail-closed по
   умолчанию), а не как код, подлежащий обязательной правке.

Ничего из обнаруженного не тянет за собой удаление функциональности, используемой ДРУГИМИ
инструментами (единственное условие для возврата без завершения по заданию) — GET-хелпер внутри
`delete-component.operation.ts` не разделяемый, `DeleteFieldOperation` используется только
`delete_global_field`.

---

## 5. Итоговые количества

- **Файлов удалить целиком:** 13 (8 src + 5 тестов; см. строки 1-13 таблицы).
- **Файлов править точечно:** 32 (строки 14-45 таблицы за вычетом строк 12-13, 33, 35-40, которые
  либо удаляются целиком, либо не трогаются вовсе; посчитано по факту действия «править точечно»
  в столбце «Действие» — строки 14-31, 33-34, 41-45 = 23 файла с точечной правкой кода/докстрок,
  плюс 27 (`CLAUDE.md` §5.1) как рекомендация).
  Уточнение подсчёта: точечных правок кода/докстрок в таблице — 23 файла (14-24, 26, 28, 30,
  33-34, 41-45 = 14+15+16+17+18+19+20+21+22+23+24+26+28+30+33+34+41+42+43+44+45 = 21 файл кода/
  тестов + 26 (`CLAUDE.md` счётчик «92 штуки») = 22, плюс рекомендательная правка §5.1 (27) отдельно).
- **Файлов НЕ трогать (проверены и намеренно оставлены как есть):** 8 (35-40, 46-группа).
- **Файлов регенерировать скриптом, не редактировать руками:** 4
  (`tests/COVERAGE_MATRIX.md`, `doc-route-sweep.md`, `outgoing-requests.md` — 3 файла;
  плюс сам `tests/COVERAGE_MATRIX.md` пересчитается после точечной правки
  `scripts/build-coverage-matrix.ts`).
- **Строковых идентификаторов-инструментов, требующих синхронной правки счётчика:**
  2 захардкоженных числа (`92` → `90` в `tests/smoke/tool-contract-3-1-c.smoke.test.ts`, 3
  вхождения в одном файле; `92` → `90` в `CLAUDE.md` §дев-интерфейс, 1 вхождение) плюс 1 счётчик
  храповика (`LEGACY_MOCK_TEST_BASELINE_COUNT`: 33 → 32) плюс 1 текстовый счётчик в
  `README.md` («Components (4 инструмента)» → «(3 инструмента)»).
- **Осиротевших символов/хелперов:** 0.
- **Исторических `.agentic-planning`-файлов с упоминаниями (не редактируются):** 15.
- **Использований GET `/v3/components/{id}` вне `delete-component.operation.ts`:** 0 (нет
  отдельного `GetComponentOperation`; только list-операция `GetComponentsOperation` с другим
  маршрутом `/v3/queues/{id}/components`).

