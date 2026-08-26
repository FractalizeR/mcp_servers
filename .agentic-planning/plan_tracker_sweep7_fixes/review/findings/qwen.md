# Находки — qwen

Задание: `.agentic-planning/plan_tracker_sweep7_fixes/review/BRIEF.md`. Диффа-манифеста
(`diff_files.txt`) в `review_root` нет — по контракту фасилитатора это означает "весь
дифф в scope", поэтому `in_scope` у всех находок вычислен по прямому вхождению файла в
`.agentic-planning/plan_tracker_sweep7_fixes/review/changes.diff` (проверено `grep`) и
везде оказался "да".

---

### qwen-01

- **reviewer**: qwen
- **severity**: MEDIUM
- **kind**: contract
- **domain**: style
- **title**: Комментарий entity утверждает, что `PATCH` отвечает той же формой, что и `GET`, — вопреки живой пробе
- **mechanism**: Пакет C2 сознательно типизировал ответ «по наблюдению, а не по документации»: живая проба зафиксировала, что `PATCH .../permissions` отвечает **только** `{self, version}` (без единого разрешения), а полную форму, ключёванную разрешением, отдаёт `GET`. Заголовок `queue-permission.entity.ts` при этом заявляет обратное — что `PATCH` отвечает той же формой, что и `GET`, и ссылается на инвентарный JSON, который на самом деле является ответом `GET` (полная форма). Это тот самый класс дефекта («типизация по документации вместо наблюдения»), ради устранения которого затевался пакет C2; комментарий реинтродуцирует недокументированное допущение в месте, где фикс был аккуратен.
- **trigger**: воспроизводится в нормальной работе как фактор будущего риска — любой, кто будет дорабатывать выход `manage_queue_access`, читает этот комментарий; функциональной поломки сегодня нет (все ключи разрешений в типе опциональны, отсутствие даёт `FIELDS_WITHOUT_VALUE`).
- **in_scope**: да
- **anchor**: `packages/servers/yandex-tracker/src/tracker_api/entities/queue-permission.entity.ts:4-8`
- **evidence**:
  ```typescript
  * снята живой пробой 2026-08-26 на очереди `TESTSWEEPB`
  * (`.agentic-planning/plan_tracker_sweep7_fixes/inventory/queue-permissions-response-2026-08-26.json`;
  * `PATCH` отвечает той же формой, что и `GET` того же ресурса).
  ```
  Контр-факт из `0_LIVE_RUN_REPORT_2026-08-26.md` (строки 114-116): «`PATCH` отвечает **только**
  `{ self, version }`, без единого разрешения. Полную форму ... отдаёт `GET` того же ресурса».
- **verification**: confirmed
- **verification_note**: сверил дословно комментарий в `queue-permission.entity.ts:4-8` (прочитан
  Read) с `0_LIVE_RUN_REPORT_2026-08-26.md`. Живой отчёт однозначно разделяет формы `PATCH`
  (минимальная) и `GET` (полная, она же в инвентарном JSON); фраза «той же формой» этому
  противоречит. Возможно смягчающее чтение («обе суть объект `QueuePermissions`, а не массив»),
  но формулировка вводит в заблуждение именно относительно заполненности ключей у ответа `PATCH`.
- **fix_direction**: переписать фразу так, чтобы отражала наблюдение: `PATCH` возвращает только
  `{self, version}`, полную форму отдаёт `GET`; явно пометить, что инвентарный JSON — это ответ
  `GET`. Проверить и при необходимости выверить аналогичную формулировку в
  `src/tracker_api/entities/README.md`.

---

### qwen-02

- **reviewer**: qwen
- **severity**: LOW
- **kind**: point
- **domain**: reliability
- **title**: `manage_sprint_lifecycle` не выдаёт `VERSION_NOT_PROVIDED`, хотя дочитывает версию так же, как `update_sprint`
- **mechanism**: Пакет B добавил `update_sprint` предупреждение `VERSION_NOT_PROVIDED` для случая, когда версия не передана и операция читает её сама (оптимистичная блокировка ослабляется до «последний выигрывает»). `manage_sprint_lifecycle` для `start`/`archive` делает через `readCurrentVersion` ровно то же самое, но предупреждение не выдаёт — только `FIELDS_WITHOUT_VALUE` от `ResponseFieldFilter`. Наблюдаемость ослабленной блокировки у двух инструментов одного предмета («спринт») разъехалась.
- **trigger**: воспроизводится в нормальной работе — вызов `manage_sprint_lifecycle` с
  `action: 'start'`/`'archive'` без `version` (типичный путь: вызывающий версию обычно не держит).
- **in_scope**: да
- **anchor**: `packages/servers/yandex-tracker/src/tools/api/sprints/manage-sprint-lifecycle.tool.ts:48-59` в сопоставлении с `packages/servers/yandex-tracker/src/tools/api/sprints/update-sprint.tool.ts:44-58`
- **evidence**:
  ```typescript
  // manage-sprint-lifecycle.tool.ts
  return this.formatSuccess(
    { sprintId, action, sprint: filtered, message: `Спринт ${sprintId} успешно ${ACTION_MESSAGES[action]}` },
    ResponseFieldFilter.toWarnings(fieldsWithoutValue)   // VERSION_NOT_PROVIDED отсутствует
  );
  ```
  ```typescript
  // update-sprint.tool.ts — для сравнения
  const lockWarnings = version === undefined
    ? [{ code: ToolWarningCode.VERSION_NOT_PROVIDED, message: '...' }]
    : [];
  ```
- **verification**: confirmed
- **verification_note**: прочитан полный код `manage-sprint-lifecycle.tool.ts` — ветки
  `VERSION_NOT_PROVIDED` нет; `update-sprint.tool.ts` содержит `lockWarnings` с этим кодом.
  Дочитывание версии в отсутствие явного параметра подтверждено в
  `manage-sprint-lifecycle.operation.ts` (`effectiveVersion = version ?? await this.readCurrentVersion(...)`)
  для веток `start`/`archive` — идентично `update-sprint.operation.ts`.
- **fix_direction**: при `start`/`archive` без переданного `version` добавлять то же предупреждение
  `VERSION_NOT_PROVIDED`, что и `update_sprint`, для единообразия поведения инструментов одного
  предмета.

---

### qwen-03

- **reviewer**: qwen
- **severity**: LOW
- **kind**: pattern
- **domain**: architecture
- **title**: `readCurrentVersion` продублирована почти дословно в трёх операциях
- **mechanism**: Одинаковый приватный метод чтения текущей версии (GET сущности → проверка `typeof version === 'number'` → осмысленный отказ вместо `?version=undefined`) существует в трёх операциях. Две из них (`update-sprint`, `manage-sprint-lifecycle`) читают один и тот же ресурс `/v3/sprints/{id}` и побайтово идентичны, включая текст комментария и текст ошибки (с точностью до имени сущности). Правка логики (обработка ошибки, кеш, текст отказа) потребует синхронизации в трёх местах.
- **trigger**: недостижим как функциональный дефект сегодня (каждая копия покрыта своим тестом и работает корректно); это накапливаемый technical debt.
- **in_scope**: да
- **anchor**: `packages/servers/yandex-tracker/src/tracker_api/api_operations/sprint/update-sprint.operation.ts` (метод `readCurrentVersion`, конец файла), `packages/servers/yandex-tracker/src/tracker_api/api_operations/sprint/manage-sprint-lifecycle.operation.ts` (метод `readCurrentVersion`, конец файла), `packages/servers/yandex-tracker/src/tracker_api/api_operations/component/update-component.operation.ts:78-88`
- **evidence**:
  ```typescript
  // update-sprint.operation.ts и manage-sprint-lifecycle.operation.ts — идентично
  private async readCurrentVersion(sprintId: string): Promise<number> {
    const sprint = await this.httpClient.get<SprintOutput>(`/v3/sprints/${sprintId}`);
    const version = sprint.version;
    if (typeof version !== 'number') {
      throw new Error(`Не удалось прочитать версию спринта ${sprintId}: ...`);
    }
    return version;
  }
  ```
- **verification**: confirmed
- **verification_note**: прочитаны все три файла целиком; методы `readCurrentVersion` в
  `update-sprint.operation.ts` и `manage-sprint-lifecycle.operation.ts` совпадают дословно (кроме
  комментария-обёртки выше метода), `update-component.operation.ts` — та же структура с заменой
  сущности `component`.
- **fix_direction**: вынести чтение текущей версии в общий хелпер/сервис, параметризуемый путём
  ресурса и именем сущности для сообщения об ошибке, переиспользовать в трёх операциях.

---

### qwen-04

- **reviewer**: qwen
- **severity**: LOW
- **kind**: point
- **domain**: security
- **title**: `personRefs` распаковывает обёртку `{add|remove}` глобально и не осматривает соседние ключи записи
- **mechanism**: Ветка `personRefs` в `people-in-body.ts` срабатывает для любого объекта-значения, у которого есть ключ `add` или `remove`, и рекурсирует только в эти два ключа — соседние ключи той же записи не проверяются. Теоретический край: значение вида `{ add: [...свои...], <иной ключ>: <ссылка на чужого человека> }` распознает только `add`. В достижимости по реальным телам инструментов дыры нет: (а) ни одна схема инструмента не строит объект, совмещающий `add`/`remove` с посторонней ссылкой на человека на одном уровне; (б) чужой человек в `users`/`groups`/`roles` дополнительно ловится глобальным обходом `foreignPersonInBody`; (в) чужая очередь как таковая отклоняется раньше правилом владения `ownershipRule` в `organization-rules.ts` независимо от тела запроса.
- **trigger**: недостижим в нормальной работе — нужна рукотворная форма тела, которую ни один инструмент сервера не строит; воспроизводится только вручную собранным запросом мимо инструментов.
- **in_scope**: да
- **anchor**: `packages/servers/yandex-tracker/src/live_scope/people-in-body.ts:75-83`
- **evidence**:
  ```typescript
  if (isRecord(value) && ('add' in value || 'remove' in value)) {
    const collected: string[] = [];
    for (const key of ['add', 'remove'] as const) {
      if (!(key in value)) continue;
      const nested = personRefs(value[key]);
      if (nested === undefined) return undefined;
      collected.push(...nested);
    }
    return collected;
  }
  ```
- **verification**: confirmed
- **verification_note**: код прочитан целиком (`people-in-body.ts`); глобальность ветки и пропуск
  соседних ключей подтверждены по коду. Недостижимость по реальным телам — на основании
  совместного действия `foreignPersonInBody` (та же функция, вызывается по всем ключам
  рекурсивно) и `ownershipRule` для семейства очередей в `organization-rules.ts:318,321` — не
  проверял отдельным тестом-эксплойтом, полагаюсь на чтение кода трёх механизмов вместе.
- **fix_direction**: зафиксировать явную семантику соседних ключей записи `{add|remove, ...}` —
  либо рекурсировать и в них тоже, либо считать такую форму нераспознанной и отказывать
  (fail-closed), плюс тест на смешанную запись. Устраняет остаточный край без изменения текущего
  поведения на реальных телах.

---

### qwen-05

- **reviewer**: qwen
- **severity**: LOW
- **kind**: pattern
- **domain**: architecture
- **title**: Дрейф белого списка: `archived` остался в `SPRINT_KEYS` и в `UpdateSprintDto`, хотя ни одна схема инструмента его не отправляет
- **mechanism**: Пакет A/B снял из `SPRINT_KEYS` ключ `version` по принципу «белый список, разрешающий ключ, которого в теле больше нет, — дрейф, ради устранения которого список заведён». Тот же класс дрейфа остался для `archived`: поле присутствует в `UpdateSprintDto` и в белом списке рубежа `SPRINT_KEYS`, но отсутствует в обеих Zod-схемах инструментов (`create-sprint.schema.ts`, `update-sprint.schema.ts`) — то есть ни один инструмент его физически не отправляет. Ослаблением защиты это не является (`archived` — булево, не ссылка на человека/сущность), но это тот же класс несогласованности «схема ↔ рубеж», который правка только что устранила для `version`.
- **trigger**: недостижим как функциональный дефект — ключ никогда не отправляется вызывающим кодом; это нарушение инварианта «белый список = реально используемые ключи», а не эксплуатируемая брешь.
- **in_scope**: да
- **anchor**: `packages/servers/yandex-tracker/src/live_scope/organization-rules.ts:99`, `packages/servers/yandex-tracker/src/tracker_api/dto/sprint/update-sprint.dto.ts:28`
- **evidence**:
  ```typescript
  // organization-rules.ts:99
  const SPRINT_KEYS = ['name', 'board', 'startDate', 'endDate', 'status', 'archived'] as const;
  ```
  ```typescript
  // update-sprint.dto.ts:28
  archived?: boolean | undefined;
  ```
  `grep -n archived` по `create-sprint.schema.ts` и `update-sprint.schema.ts` — пусто (поля там нет).
- **verification**: confirmed
- **verification_note**: подтверждено прямым чтением `organization-rules.ts:99`,
  `update-sprint.dto.ts:1-31` и `grep` по обеим схемам инструментов спринта — совпадений `archived`
  не найдено. Поле встречается только в `sprint.entity.ts` (ответ API), `update-sprint.dto.ts` и
  `organization-rules.ts`; предсуществующий дрейф, не внесённый текущей правкой, но она применила
  тот же принцип к соседнему ключу `version` и пропустила `archived`.
- **fix_direction**: применить к `archived` тот же принцип, что применён к `version`: либо убрать
  ключ из `SPRINT_KEYS`/`UpdateSprintDto`, либо завести его в Zod-схеме инструмента, если поле
  действительно должно поддерживаться — так белый список совпадёт с реально отправляемыми ключами.

---

## Coverage

**Просмотрено и признано чистым (Qwen + верифицировано фасилитатором):**
- Весь снимок диффа (56 файлов, `changes.diff`), с акцентом на швах между пакетами:
  `organization-rules.ts` (A/B/C1), `people-in-body.ts`, `update-sprint.dto.ts` (A/B),
  `yandex-tracker.facade.ts` (B/C2), `manage-queue-access.schema.ts` (C1 вход / C2 выход),
  `mock-server.ts`, `known-mutating-requests.ts`.
- Рубеж живых прогонов: правила очереди/доступов/спринтов, глобальный обход людей
  (`foreignPersonInBody`), сопоставление пути с query (`?version=`), владение очередью по журналу
  (`ownershipRule`).
- Контракты входа/выхода `manage_queue_access` и спринтовых инструментов, операции, сервисы,
  фасад; типобезопасность (`any`/`unknown` не заведены новым кодом), границы импортов
  (`#`-префиксы/npm-имена пакетов) — нарушений не найдено.
- Тесты: юнит, операционные, интеграционные, live_scope, сервис/фасад — по заявлению Qwen
  проверяют эффект (тело/URL/query/GET-вызовы/`not.toHaveBeenCalled`), а не только код ответа.
  Фасилитатор это утверждение точечно не перепроверял (не входит в бюджет одного прогона).

**Не просмотрено / не до конца (со слов Qwen, фасилитатором не расширялось):**
- Пакет D глубоко: `scripts/sweep-doc-routes.ts`, `doc-route-sweep.md`, `outgoing-requests.md`,
  `3_OPEN_ITEMS.md`, правки `README.md` — видены в диффе, но перегенерированные артефакты сверки
  построчно не верифицированы.
- Полный набор кейсов интеграционного теста `manage-sprint-lifecycle` (оснастка и направление
  осмотрены; операционный и юнит-тесты инструмента проверены полностью).
- `npm run validate:quiet` не запускался (read-only по заданию) — полагается на заявление брифа о
  зелёной валидации.
- Расхождение снимка и рабочего дерева: по заявлению Qwen,
  `tests/.../sprint/update-sprint.operation.test.ts` присутствует в рабочем дереве, но отсутствует
  в `changes.diff` — снимок диффа может быть неполным относительно текущего состояния рабочего
  дерева. Фасилитатор это отдельно не проверял.

**Допущения фасилитатора:**
- `diff_files.txt` в `review_root` отсутствует — по контракту это трактуется как режим «ревью
  всего диффа/проекта», `in_scope` для всех находок вычислен прямой сверкой файла со списком
  файлов в `changes.diff`, а не по формальному манифесту.

## Отклонённые (refuted) находки Qwen

- `qwen-refuted-01` | «чужой человек перестал распознаваться из-за обёртки `{add|remove}`» |
  Qwen: достижимой дыры нет — ссылки на людей в `users`/`groups`/`roles` распознаются
  дополнительно глобальным обходом, чужая очередь отклоняется правилом владения независимо от
  тела. Остаточный недостижимый край зафиксирован отдельно как qwen-04.
- `qwen-refuted-02` | «тест, зафиксировавший старое поведение манеры ответа `manage_queue_access`,
  остался зелёным» | Qwen: не найден — интеграционный тест ранее утверждал
  `Array.isArray(permissions)===true`, теперь заменён на `===false` и объектную форму; юнит/
  операционные/live_scope-тесты переписаны под новый контракт.
- `qwen-refuted-03` | «`version` не объявлен в схеме `update_sprint`» | Qwen: поле присутствует в
  `update-sprint.schema.ts`, оптимистичная блокировка рабочая.
- `qwen-refuted-04` | «выход `manage_sprint_lifecycle` ломается на `sprint: null` при `delete`» |
  Qwen: выходная схема `FilteredEntitySchema.nullable()`, инструмент возвращает `null` до
  фильтрации — не ломается.
