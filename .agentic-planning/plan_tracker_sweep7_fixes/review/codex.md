### codex-01

- **reviewer**: codex
- **severity**: HIGH
- **kind**: pattern
- **domain**: reliability
- **title**: Снятые параметры (`country`, `startDateTime`/`endDateTime`) по-прежнему принимаются на входе и молча отбрасываются
- **mechanism**: `country`, `startDateTime`, `endDateTime` удалены из трёх Zod-схем (`update-board`, `create-sprint`, `update-sprint`), но схемы остаются обычными `z.object()` без `.strict()`. `safeParse` на нестрогом объекте отбрасывает лишние ключи и возвращает `success: true`; `BaseTool.validateParams()` передаёт очищенные данные инструменту без сигнала о потере. Вызов со старым/закешированным контрактом клиента не получает отказ: доска обновляется без учтённого `country`, спринт создаётся/обновляется без заданных дат, и инструмент рапортует об успехе — тот же класс дефекта (D9, «параметр молча игнорируется»), ради которого параметры и снимались.
- **trigger**: воспроизводится в нормальной работе — достаточно вызвать инструмент с ранее опубликованным параметром (например, из клиента со старой схемой) вместе с обязательными полями
- **in_scope**: да
- **anchor**:
  - `packages/servers/yandex-tracker/src/tools/api/boards/update-board.schema.ts:46-73`
  - `packages/servers/yandex-tracker/src/tools/api/sprints/create-sprint.schema.ts:23-36`
  - `packages/servers/yandex-tracker/src/tools/api/sprints/update-sprint.schema.ts`
- **evidence**:
  ```typescript
  // update-board.schema.ts — обычный z.object(), без .strict()
  export const UpdateBoardParamsSchema = z
    .object({
      boardId: buildEntityIdSchema('Board'),
      // ... country и version отсутствуют, но объект не строгий
      fields: FieldsSchema,
    })
    .refine(/* ... */);
  ```
  ```typescript
  // packages/framework/core/src/tools/base/base-tool.ts:220-237
  protected validateParams<T>(params, schema) {
    const validationResult = schema.safeParse(params);
    if (!validationResult.success) { /* ... */ }
    return { success: true, data: validationResult.data }; // лишние ключи молча вырезаны
  }
  ```
- **verification**: confirmed
- **verification_note**: подтверждено чтением `BaseTool.validateParams` (safeParse на нестрогом объекте) и трёх изменённых схем — ни одна не помечена `.strict()`. Zod по умолчанию для `z.object()` в non-strict режиме отбрасывает неизвестные ключи, не считая это ошибкой валидации.
- **fix_direction**: сделать снятые параметры явно отклоняемыми (например, `.strict()` на схемах или явный `refine`, отклоняющий присутствие `country`/`startDateTime`/`endDateTime` в сыром input) и добавить регрессионный тест на каждый снятый параметр, проверяющий отказ вместо тихого игнорирования.

### codex-02

- **reviewer**: codex
- **severity**: MEDIUM
- **kind**: pattern
- **domain**: tests
- **title**: Комментарий и happy-path тест `manage_queue_access` утверждают форму ответа PATCH, прямо противоречащую задокументированному живому наблюдению
- **mechanism**: `0_LIVE_RUN_REPORT_2026-08-26.md` фиксирует дословно: «PATCH отвечает только `{self, version}`, без единого разрешения. Полную форму отдаёт GET того же ресурса». Комментарий в `queue-permission.entity.ts` тут же утверждает обратное — «PATCH отвечает той же формой, что и GET того же ресурса». Основной happy-path интеграционный тест мокает `patch`-запрос, отвечающий полным объектом с вложенными `write.users[0].display`, и требует его наличия в assertions — то есть закрепляет форму ответа, которая по документированному отчёту у PATCH никогда не наблюдалась. В результате «зелёный» happy-path тест не доказывает реальное поведение PATCH.
- **trigger**: воспроизводится при каждом штатном вызове `manage_queue_access` с запрошенными вложенными полями разрешений (`write.users` и т.п.) — реальный PATCH (по документированному наблюдению) их не возвращает
- **in_scope**: да
- **anchor**:
  - `packages/servers/yandex-tracker/src/tracker_api/entities/queue-permission.entity.ts:1-9`
  - `packages/servers/yandex-tracker/tests/integration/tools/api/queues/access/manage-queue-access.tool.integration.test.ts:49-73`
- **evidence**:
  ```typescript
  // queue-permission.entity.ts:1-9
  /**
   * ... `PATCH` отвечает той же формой, что и `GET` того же ресурса).
   */
  ```
  Против:
  ```markdown
  <!-- 0_LIVE_RUN_REPORT_2026-08-26.md -->
  `PATCH` отвечает **только** `{ self, version }`, без единого разрешения. Полную форму
  ... отдаёт `GET` того же ресурса
  ```
  ```typescript
  // manage-queue-access.tool.integration.test.ts:59-72
  .reply(200, createQueuePermissionsFixture()); // полный объект на PATCH
  // ...
  expect(permissions.write?.users?.[0]?.display).toBeDefined();
  ```
- **verification**: confirmed
- **verification_note**: прямое противоречие между текстом собственного отчёта о живом прогоне (артефакт этой же починки) и комментарием в коде, подтверждено построчным чтением обоих файлов. Рантайм не падает благодаря `FilteredEntitySchema`, поэтому дефект — в типовом контракте и тестовом покрытии, а не в падении при выполнении.
- **fix_direction**: привести комментарий сущности в соответствие с зафиксированным наблюдением (PATCH ≠ GET по форме), развести тип receipt-ответа PATCH (`{self, version}`) и полную форму GET, перемокать happy-path под наблюдённую wire-форму PATCH.

### codex-03

- **reviewer**: codex
- **severity**: MEDIUM
- **kind**: point
- **domain**: reliability
- **title**: Сообщение `VERSION_NOT_PROVIDED` заявляет о состоявшемся факте перезаписи чужой правки, которого код не наблюдает
- **mechanism**: `UpdateSprintOperation` при отсутствии `version` делает GET текущей версии и сразу PATCH с ней — классическое окно гонки между чтением и записью. Код не имеет способа узнать, произошла ли за это время чужая конкурентная правка. Тем не менее предупреждение `VERSION_NOT_PROVIDED` формулирует это как свершившийся факт: «чужая параллельная правка перезаписана без конфликта» — хотя в подавляющем большинстве вызовов никакой конкурентной правки не было вовсе.
- **trigger**: воспроизводится при каждом успешном `update_sprint` без явного `version` — включая случаи без единой конкурентной правки, то есть сообщение ложно в общем случае
- **in_scope**: да
- **anchor**: `packages/servers/yandex-tracker/src/tools/api/sprints/update-sprint.tool.ts:41-51`
- **evidence**:
  ```typescript
  const lockWarnings =
    version === undefined
      ? [
          {
            code: ToolWarningCode.VERSION_NOT_PROVIDED,
            message:
              'Версия не передана: операция прочитала текущую сама, поэтому чужая ' +
              'параллельная правка перезаписана без конфликта. Передавай version ' +
              'из поля version спринта, чтобы получить отказ вместо перезаписи.',
          },
        ]
      : [];
  ```
- **verification**: confirmed
- **verification_note**: подтверждено чтением `UpdateSprintOperation.execute`/`readCurrentVersion` — операция не имеет данных для утверждения факта перезаписи, только факта отсутствия переданной версии вызывающим.
- **fix_direction**: переформулировать сообщение так, чтобы оно называло риск («изменения между чтением вызывающего и внутренним GET не обнаруживаются»), а не утверждало происшедший факт перезаписи.

### codex-04

- **reviewer**: codex
- **severity**: MEDIUM
- **kind**: pattern
- **domain**: architecture
- **title**: `readCurrentVersion` дословно продублирован в трёх операциях
- **mechanism**: `UpdateComponentOperation`, `UpdateSprintOperation` и `ManageSprintLifecycleOperation` независимо реализуют идентичный приватный метод `readCurrentVersion`: GET сущности, извлечение `version`, проверка `typeof version !== 'number'`, одинаковый текст исключения и комментария. Правка данной пакетом задача добавила ещё одну копию поверх уже существовавшей — общий optimistic-lock контракт теперь имеет три независимых источника поведения; расхождение при следующей правке одной из копий не поймает ни один тест, кроме дублирующего сравнения кода.
- **trigger**: не проявляется функционально сейчас; проявится при следующем изменении контракта чтения версии (валидация, формат ошибки) — тогда копии легко разойдутся незамеченно
- **in_scope**: да — две из трёх копий (`update-sprint`, `manage-sprint-lifecycle`) находятся в изменённых файлах
- **anchor**:
  - `packages/servers/yandex-tracker/src/tracker_api/api_operations/sprint/update-sprint.operation.ts:58-73`
  - `packages/servers/yandex-tracker/src/tracker_api/api_operations/sprint/manage-sprint-lifecycle.operation.ts:65-80`
- **evidence**:
  ```typescript
  // Идентично в обоих файлах (и в update-component.operation.ts):
  private async readCurrentVersion(sprintId: string): Promise<number> {
    const sprint = await this.httpClient.get<SprintOutput>(`/v3/sprints/${sprintId}`);
    const version = sprint.version;
    if (typeof version !== 'number') {
      throw new Error(
        `Не удалось прочитать версию спринта ${sprintId}: ответ API её не содержит. ` +
          'Передай version параметром инструмента.'
      );
    }
    return version;
  }
  ```
- **verification**: confirmed
- **verification_note**: построчное сравнение трёх реализаций (третья — `update-component.operation.ts`, вне диффа) не выявило содержательного различия, кроме имени сущности/URL и текста сообщения.
- **fix_direction**: вынести единый механизм чтения и валидации обязательной версии (параметризуемый по endpoint и имени сущности) в общее место (например, `BaseOperation` или отдельный helper), операции — только вызывают его.

### codex-05

- **reviewer**: codex
- **severity**: LOW
- **kind**: pattern
- **domain**: reliability
- **title**: `redactionAllowlist` у `manage_sprint_lifecycle` не обновлён под новые входные параметры
- **mechanism**: `ManageSprintLifecycleParamsSchema` пакетом B получила `version` и обязательный `fields`, но `MANAGE_SPRINT_LIFECYCLE_TOOL_METADATA.redactionAllowlist` остался `['sprintId', 'action']`. `ToolRegistry` при логировании берёт allowlist только из metadata, поэтому значения `version`/`fields` в debug-логах будут редактированы (скрыты) — хотя это безобидные диагностические параметры, а не секреты, что затрудняет разбор конфликтов версии и фильтрации ответа по логам.
- **trigger**: воспроизводится при каждом вызове `manage_sprint_lifecycle` с логированием на уровне debug и переданными `version`/`fields`
- **in_scope**: да — сторона schema находится в изменённых файлах пакета B
- **anchor**: `packages/servers/yandex-tracker/src/tools/api/sprints/manage-sprint-lifecycle.metadata.ts:24`
- **evidence**:
  ```typescript
  redactionAllowlist: ['sprintId', 'action'],
  ```
  При этом `manage-sprint-lifecycle.schema.ts` объявляет ещё `version` и `fields` как параметры инструмента.
- **verification**: confirmed
- **verification_note**: сравнение `manage-sprint-lifecycle.schema.ts` (поля `sprintId`, `action`, `version`, `fields`) и `redactionAllowlist` в metadata — `version`/`fields` в списке отсутствуют. Машинной проверки соответствия allowlist и схемы в проекте нет.
- **fix_direction**: добавить `version` и `fields` в `redactionAllowlist` (или иной корректный статус редактирования по правилам проекта) и рассмотреть общий тест/генератор, сверяющий allowlist metadata с полями актуальной схемы каждого инструмента.

## Coverage

- Прочитан целиком снапшот `changes.diff` (4206 строк, 56 diff-заголовков), без деления материала на слайсы.
- Прочитаны корневой `CLAUDE.md`, `packages/servers/yandex-tracker/CLAUDE.md`, `tests/TESTING_STRATEGY.md`, `0_LIVE_RUN_REPORT_2026-08-26.md`, `1_PLAN.md`, `2_REVIEW_RESOLUTION.md`, `inventory/queue-permissions-response-2026-08-26.json`.
- Проверены межпакетные швы, названные в задании: `organization-rules.ts` (A/B/C1), DTO `update-sprint.dto.ts` (A/B), `yandex-tracker.facade.ts` (B/C2), `manage-queue-access.schema.ts` (C1 вход / C2 выход), `mock-server.ts`, `known-mutating-requests.ts`.
- Версия спринта корректно вынесена из тела в query-параметр во всех трёх lifecycle-операциях (`update_sprint`, `_start`, `_archive`); `delete` версию не запрашивает и не отправляет.
- `manage_sprint_lifecycle.fields` теперь реально фильтрует ответ (было — молча игнорировался); `delete` возвращает `null` без ложного `FIELDS_WITHOUT_VALUE`.
- Новая форма `manage_queue_access` (`permission × subjectKind × action × subjects` на входе, тело `{permission: {subjectKind: {action: subjects}}}`) построена согласованно между schema, DTO и operation.
- `people-in-body.ts`: обе ветки обёртки `{add|remove}` разбираются рекурсивно, посторонний субъект (не из `add`/`remove`) по-прежнему ловится белым списком — независимая находка о «дыре» в этом месте не подтвердилась (см. Refuted ниже).
- `organization-rules.ts`: старая форма `{queue-lead: {add: [...]}}` отклоняется рубежом; чужая очередь по-прежнему отклоняется по журналу владения; расширенный whitelist ключей тела доступов очереди не даёт штатному инструменту отправить multi-permission или `deny.roles` payload (Zod отклоняет их раньше).
- Не найдено оставшихся ссылок на старые символы (`QueueRole`, `QueuePermissionWithUnknownFields`) или старые вызовы facade.
- Удалённые параметры (`country`, `startDateTime`, `endDateTime`, тело-`version` спринта) отсутствуют в DTO, metadata и сгенерированных артефактах — сам факт их отсутствия в контракте корректен; проблема (codex-01) в том, что рантайм-приём неизвестных ключей на входе не заблокирован.
- Типобезопасность: `any`/`unknown` в изменённых файлах не встретились как нарушение правил проекта.

**Не проверено / ограничение прохода:** собственный запуск тестов (`npm run validate:quiet` или точечный `vitest`) в окружении прогона не удался — `EPERM` при создании `node_modules/.vite-temp` в read-only/sandboxed окружении. Заявленную пользователем зелёную `validate:quiet` этот проход не повторял независимо — верификация находок велась чтением кода и сопоставлением с задокументированными фактами (живой отчёт), а не запуском тестов.

## Refuted

- codex-R01 | Обёртка `{add|remove}` в `people-in-body.ts` открывает возможность спрятать чужого пользователя | обе ветки (`add` и `remove`) разбираются рекурсивно тем же `personRefs`, посторонний субъект вне разрешённой формы по-прежнему ловится белым списком `organization-rules.ts`
- codex-R02 | Расширенный whitelist ключей тела `manage_queue_access` позволяет штатному инструменту отправить multi-permission payload или `deny.roles` | `ManageQueueAccessOperation` всегда строит ровно один `permission`/`subjectKind`/`action` за вызов, а Zod-схема отклоняет `deny` как значение `permission`; достижимого пути через сам MCP tool не найдено
- codex-R03 | `manage_queue_access` обязан требовать `requiresExplicitUserConsent` только на основании того, что операция пишет данные | действующий машинный контракт проекта связывает consent-требование с необратимостью действия; одиночные `add`/`remove` классифицированы как обратимые и согласованы с `destructiveHint: false` в metadata
- codex-R04 | Ответ `{self, version}` без ключей разрешений обязательно роняет инструмент в рантайме | HTTP-клиент не выполняет строгий runtime-парсинг entity на этом пути, а `FilteredEntitySchema` принимает отфильтрованную/усечённую запись; реальная проблема — не падение, а несоответствие типов/тестов задокументированному факту (см. codex-02)
