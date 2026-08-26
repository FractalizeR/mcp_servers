### codex-01

- **reviewer**: codex
- **severity**: HIGH
- **kind**: pattern
- **domain**: reliability
- **title**: Снятые параметры по-прежнему принимаются и молча игнорируются
- **mechanism**: `country`, `startDateTime` и `endDateTime` удалены из трёх Zod-схем, но схемы остаются обычными `z.object()` без строгой проверки неизвестных ключей. Zod удаляет лишние ключи и возвращает успешный результат; `BaseTool.validateParams()` передаёт очищенные данные инструменту. Поэтому вызов по старому контракту не получает отказ: доска обновляется пустым телом, спринт создаётся без заданного времени либо обновляется пустым PATCH, после чего инструмент сообщает об успехе. Это сохраняет тот же класс D9, ради устранения которого параметры снимались.
- **trigger**: воспроизводится в нормальной работе — достаточно вызвать инструмент из клиента со старой/закешированной схемой или передать ранее опубликованный параметр вручную вместе с обязательными полями
- **in_scope**: да
- **anchor**:
  - `packages/servers/yandex-tracker/src/tools/api/boards/update-board.schema.ts`
  - `packages/servers/yandex-tracker/src/tools/api/sprints/create-sprint.schema.ts`
  - `packages/servers/yandex-tracker/src/tools/api/sprints/update-sprint.schema.ts`
- **evidence**:
  1. Все три изменённые схемы используют нестрогий объект:
     ```typescript
     export const CreateSprintParamsSchema = z.object({
       // ...
       fields: FieldsSchema,
     });
     ```
  2. Успешный разбор передаёт очищенное значение без проверки потерянных ключей:
     ```typescript
     const validationResult = schema.safeParse(params);
     // ...
     return { success: true, data: validationResult.data };
     ```
     `packages/framework/core/src/tools/base/base-tool.ts:225-237`
  3. Изолированная проверка текущей версии Zod для `{boardId, fields, country}` вернула `success: true`, а `country` исчез из `data`. Поиск по тестам не нашёл ни одного регрессионного кейса с `country`, `startDateTime` или `endDateTime`.
- **verification**: confirmed
- **verification_note**: поведение подтверждено чтением `BaseTool`, трёх схем, инструментов и отдельным чистым вызовом `safeParse`; существующий детектор неизвестных параметров добавляет их только когда запрос уже невалиден по другой причине
- **fix_direction**: обеспечить явный отказ или контрактное предупреждение для снятых параметров до facade/HTTP и добавить тесты каждого старого параметра с проверкой отсутствия HTTP-вызова

### codex-02

- **reviewer**: codex
- **severity**: MEDIUM
- **kind**: pattern
- **domain**: tests
- **title**: Модель ответа `manage_queue_access` смешивает несовместимые ответы GET и PATCH
- **mechanism**: живой отчёт фиксирует, что PATCH всегда вернул только `{self, version}`, а полный объект разрешений отдаёт отдельный GET. Код объявляет общую сущность для обоих ответов, комментарий прямо утверждает одинаковую форму, а основной интеграционный happy path мокает невозможный полный PATCH-ответ. Дополнительный тест «версии без разрешений» ближе к реальности, но его фикстура добавляет `self`, хотя принятый план отдельно требует переживать ответ `{"version": 11}`. В результате зелёный тест на `write.users.display` не доказывает реальное поведение PATCH, а типы и комментарии утверждают больше наблюдённого.
- **trigger**: воспроизводится при каждом штатном `manage_queue_access`, когда запрошены вложенные поля разрешений — реальный PATCH их не возвращает, поэтому инструмент может вернуть лишь receipt `{self, version}` и предупреждение вместо заявленного состояния прав
- **in_scope**: да
- **anchor**:
  - `packages/servers/yandex-tracker/src/tracker_api/entities/queue-permission.entity.ts`
  - `packages/servers/yandex-tracker/tests/integration/tools/api/queues/access/manage-queue-access.tool.integration.test.ts`
  - `packages/servers/yandex-tracker/tests/helpers/queue-permission.fixture.ts`
- **evidence**:
  1. Неверное утверждение сущности:
     ```typescript
     * `PATCH` отвечает той же формой, что и `GET` того же ресурса).
     ```
  2. Happy path PATCH мокает полный GET-подобный объект и требует вложенного пользователя:
     ```typescript
     .reply(200, createQueuePermissionsFixture());
     // ...
     expect(permissions.write?.users?.[0]?.display).toBeDefined();
     ```
  3. Фикстура, названная version-only, фактически возвращает:
     ```typescript
     return {
       self: 'https://api.tracker.yandex.net/v3/queues/TEST/permissions',
       version,
     };
     ```
     Это противоречит `0_LIVE_RUN_REPORT_2026-08-26.md:114-123` и плановому кейсу `{"version": 11}`.
- **verification**: confirmed
- **verification_note**: расхождение подтверждается дословным живым отчётом и текущими фикстурами; рантайм не падает на кратком объекте благодаря `FilteredEntitySchema`, поэтому дефект находится прежде всего в типовом и тестовом контракте
- **fix_direction**: разделить тип receipt ответа PATCH и полную форму GET; мокать точную наблюдённую wire-форму, отдельно покрыть настоящий `{version}` и выполнять GET после PATCH, если публичный результат должен содержать состояние разрешений

### codex-03

- **reviewer**: codex
- **severity**: MEDIUM
- **kind**: point
- **domain**: reliability
- **title**: `VERSION_NOT_PROVIDED` ложно утверждает, что чужая правка уже перезаписана
- **mechanism**: инструмент знает только то, что вызывающий не передал версию. Операция непосредственно перед PATCH читает текущую версию и отправляет её как optimistic-lock query. Конкурентная правка между GET и PATCH должна привести к конфликту; произошедшее перезаписывание код не наблюдает. Несмотря на это, предупреждение категорически сообщает о состоявшейся потере чужой правки, нарушая канон «предупреждение называет наблюдаемый факт, а не гипотезу».
- **trigger**: воспроизводится при каждом успешном `update_sprint` без явного `version`, включая случаи без единого конкурентного изменения
- **in_scope**: да
- **anchor**: `packages/servers/yandex-tracker/src/tools/api/sprints/update-sprint.tool.ts:41-51`
- **evidence**:
  ```typescript
  'Версия не передана: операция прочитала текущую сама, поэтому чужая ' +
    'параллельная правка перезаписана без конфликта. Передавай version ' +
    'из поля version спринта, чтобы получить отказ вместо перезаписи.',
  ```
- **verification**: confirmed
- **verification_note**: `UpdateSprintOperation` выполняет GET, затем PATCH с прочитанной версией; ни ответ API, ни локальное состояние не позволяют установить факт чужой правки или её перезаписи
- **fix_direction**: сообщать только наблюдаемый факт и реальный риск — версия вызывающего отсутствовала, поэтому изменения между более ранним чтением вызывающего и внутренним GET не обнаруживаются

### codex-04

- **reviewer**: codex
- **severity**: MEDIUM
- **kind**: pattern
- **domain**: architecture
- **title**: Дочитывание текущей версии размножено в трёх операциях
- **mechanism**: `update_component`, `update_sprint` и `manage_sprint_lifecycle` независимо реализуют одинаковые GET, извлечение `version`, проверку числа и почти одинаковое исключение. Две новые копии закрепляют три источника поведения для одного optimistic-lock контракта; изменение правил валидации версии или диагностики легко разойдётся между операциями.
- **trigger**: проявится при следующем изменении общего контракта версии или формы ошибки; текущие вызовы функционально работают
- **in_scope**: да — две из трёх копий добавлены в изменённых файлах
- **anchor**:
  - `UpdateComponentOperation.readCurrentVersion`
  - `UpdateSprintOperation.readCurrentVersion`
  - `ManageSprintLifecycleOperation.readCurrentVersion`
- **evidence**:
  1. `update-sprint.operation.ts:62-73` — GET сущности, `typeof version !== 'number'`, исключение.
  2. `manage-sprint-lifecycle.operation.ts:71-82` — та же последовательность дословно.
  3. `update-component.operation.ts:78-89` — исходная третья копия того же алгоритма.
- **verification**: confirmed
- **verification_note**: сравнение трёх реализаций не выявило содержательного различия, кроме имени сущности и URL
- **fix_direction**: вынести единый механизм чтения и проверки обязательной версии с параметризуемым endpoint и названием сущности; операции должны владеть только выбором момента его вызова

### codex-05

- **reviewer**: codex
- **severity**: LOW
- **kind**: pattern
- **domain**: reliability
- **title**: Metadata `manage_sprint_lifecycle` не догнало новые входные параметры
- **mechanism**: схема добавила `version` и обязательный `fields`, но `redactionAllowlist` остался на старом контракте. Registry поэтому скрывает значения этих безопасных диагностических параметров в debug-логах, затрудняя разбор конфликтов версии и фильтрации ответа.
- **trigger**: воспроизводится при каждом вызове `manage_sprint_lifecycle` с `version` и `fields`
- **in_scope**: да — одна сторона шва находится в изменённой schema
- **anchor**:
  - `packages/servers/yandex-tracker/src/tools/api/sprints/manage-sprint-lifecycle.schema.ts:30-41`
  - `packages/servers/yandex-tracker/src/tools/api/sprints/manage-sprint-lifecycle.metadata.ts:24`
- **evidence**:
  ```typescript
  redactionAllowlist: ['sprintId', 'action'],
  ```
  При этом схема теперь содержит `version` и `fields`; `ToolRegistry` берёт allowlist исключительно из metadata.
- **verification**: confirmed
- **verification_note**: по `ToolRegistry.execute()` параметры вне allowlist логируются только как редактированная форма; машинного барьера соответствия schema и allowlist нет
- **fix_direction**: синхронизировать allowlist с новым контрактом и добавить общий тест/генератор соответствия metadata актуальным схемам

## Coverage

Проверено и признано чистым:

- Полностью прочитан snapshot `changes.diff`: 4206 строк, 56 diff-заголовков, без деления материала.
- Прочитаны корневой и пакетный `CLAUDE.md`, обе стратегии тестирования, живой отчёт, план, resolution ревью и сырой inventory ответа permissions.
- Проверены все межпакетные швы, названные в задании: DTO → tool → facade → operation → HTTP, metadata → schema, fixtures → integration harness, live-scope → known requests.
- Версия спринта корректно исключена из тела и передаётся query-параметром; явная версия исключает GET, отсутствующая вызывает ровно один GET; delete не делает GET и не отправляет version.
- `manage_sprint_lifecycle.fields` теперь реально фильтрует ответ; delete корректно возвращает `null` без ложного `FIELDS_WITHOUT_VALUE`.
- Новая форма `manage_queue_access` строит тело `permission → subjectKind → action → subjects`; числовые группы и справочник ролей валидируются схемой.
- В `people-in-body` обе обёртки `add` и `remove` обходятся полностью; чужой пользователь в штатной форме обнаруживается. Дополнительные ключи тела permissions отсекаются следующим белым списком.
- Старая форма `{queue-lead: {add: [...]}}` отклоняется рубежом; чужая очередь по-прежнему отклоняется по журналу владения.
- Старые символы `QueueRole`, `QueuePermissionWithUnknownFields` и старые вызовы facade по репозиторию не остались.
- Удалённые поля отсутствуют в DTO, metadata и сгенерированных артефактах; дефект касается именно рантайм-приёма неизвестных ключей.
- `git diff --check` чист.
- Точечный запуск тестов в текущем read-only окружении не дошёл до assertions: Vite получил `EPERM` при создании `node_modules/.vite-temp`. Поэтому заявленную пользователем зелёную `validate:quiet` я не считаю независимо повторённой в этом проходе.

## Refuted

codex-R01 | Обёртка `{add|remove}` позволяет спрятать чужого пользователя | обе разрешённые ветки рекурсивно разбираются, а посторонние действия формы permissions отклоняются белым списком

codex-R02 | Расширенный whitelist permissions позволяет штатному инструменту отправить multi-form или `deny.roles` | операция всегда строит один permission/subjectKind/action, а Zod отклоняет `deny.roles`; достижимого пути через текущий MCP tool нет

codex-R03 | `manage_queue_access` обязан требовать explicit consent только потому, что пишет данные | действующий машинный контракт проекта связывает consent с необратимостью; одиночные add/remove классифицированы как обратимые и согласованы с `destructiveHint: false`

codex-R04 | Ответ `{version}` обязательно роняет инструмент в рантайме | HTTP generic не выполняет runtime-парсинг entity, а `FilteredEntitySchema` принимает отфильтрованную запись; проблема остаётся в типах и ложном тестовом покрытии, отражённом в codex-02
