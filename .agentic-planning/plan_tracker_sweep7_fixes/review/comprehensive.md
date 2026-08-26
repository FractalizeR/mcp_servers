# Находки ревью — comprehensive (plan_tracker_sweep7_fixes)

Материал: незакоммиченные изменения ветки `main` (56 файлов), снимок
`.agentic-planning/plan_tracker_sweep7_fixes/review/changes.diff` + рабочее дерево.
Глубина: thorough, без деления на слайсы. Пути ниже — от
`packages/servers/yandex-tracker/`, если не указано иное.

---

### claude-01

- **reviewer**: claude
- **severity**: HIGH
- **kind**: point
- **domain**: security
- **title**: Обёртка `{add|remove}` в `personRefs` молча игнорирует соседние ключи объекта — нераспознанная форма перестала быть отказом
- **mechanism**: Новая ветка распаковки срабатывает по факту наличия ключа `add` ИЛИ `remove` и после этого собирает ссылки ТОЛЬКО из этих двух ключей, возвращая непустой результат. Остальные ключи того же объекта не проверяются и не приводят к `undefined`. До правки такой объект уходил в `refOf(value, 'id')` и либо давал ссылку (и проверку на владельца прогона), либо `undefined` → отказ «ссылка на человека не распознана». Теперь тело вида `{ assignee: { add: ['<владелец>'], id: '<чужой>' } }` рубеж пропускает: `add` даёт владельца, `id` не смотрит никто. Ключ `assignee` при этом входит в `ISSUE_UPDATE_KEYS` (`src/live_scope/custom-fields-in-body.ts:44-50`), то есть белым списком ключей тела задачи такое тело не отсекается, а `customFields` инструмента `update_issue` объявлен `z.record(z.string(), z.unknown())` и расплющивается в тело последним (`src/tools/api/issues/update/update-issue.tool.ts:68-75`), перекрывая разобранный `assignee`. Это прямая инверсия принципа, объявленного в шапке самого файла: «поле с неизвестным именем ловится белым списком… неизвестная форма — отказ».
- **trigger**: воспроизводится на рукотворном входе живого прогона (`update_issue.customFields` принимает произвольную структуру); дополнительно — при любом дрейфе формы тела `manage_queue_access`, где обёртка и появилась
- **in_scope**: да
- **anchor**: `src/live_scope/people-in-body.ts:75-84`
- **evidence**:
  ```ts
  if (isRecord(value) && ('add' in value || 'remove' in value)) {
    const collected: string[] = [];
    for (const key of ['add', 'remove'] as const) {
      if (!(key in value)) continue;
  ```
- **verification**: confirmed
- **verification_note**: механизм подтверждён чтением кода: ветка возвращает `collected` до строки 85-86, где единственная проверка «форма не распознана» (`refOf` → `undefined`); ни один тест не подаёт объект с обёрткой и посторонним ключом — в `tests/live_scope/body-inspection.test.ts:196-215` проверяются только чистые `{remove: [...]}`. Достижимость через `update_issue.customFields` подтверждена цепочкой схема → tool → `ISSUE_UPDATE_KEYS`. Не проверено (и проверить нечем без живой пробы), примет ли API такое смешанное тело и назначит ли чужого человека — поэтому эффект «порча чужих данных» остаётся вероятным, а не доказанным.
- **fix_direction**: сделать распаковку обёртки исчерпывающей — форма считается распознанной, только если объект не содержит ничего, кроме `add`/`remove`; любой посторонний ключ обязан возвращать «не распознано» (отказ), как это было до правки. Тест — обёртка с посторонним ключом рядом.

---

### claude-02

- **reviewer**: claude
- **severity**: MEDIUM
- **kind**: contract
- **domain**: reliability
- **title**: `manage_sprint_lifecycle` дочитывает версию и перезаписывает чужую правку молча — без `VERSION_NOT_PROVIDED`, в отличие от двух соседей того же класса
- **mechanism**: `update_sprint` и `update_component` при отсутствии `version` отдают предупреждение `VERSION_NOT_PROVIDED` ровно потому, что дочитанная версия превращает оптимистичную блокировку в «последний выигрывает». `manage_sprint_lifecycle` получил тот же механизм дочитывания (`readCurrentVersion` для `_start`/`_archive`), но предупреждения не отдаёт: вызывающий не отличает настоящую блокировку от её имитации. Асимметрия закреплена тестом: `happyPath` фабрики вызывается без `version`, а фабрика проверяет happy path на отсутствие warnings — то есть текущее «молчание» зафиксировано зелёным тестом.
- **trigger**: воспроизводится в нормальной работе — любой вызов `start`/`archive` без `version`
- **in_scope**: да
- **anchor**: контракт предупреждений `ToolWarningCode.VERSION_NOT_PROVIDED`; места — `src/tools/api/sprints/manage-sprint-lifecycle.tool.ts:36-60`, `src/tools/api/sprints/update-sprint.tool.ts:43-52`, `src/tools/api/components/update-component.tool.ts:69`
- **evidence**: в `update-sprint.tool.ts` — `version === undefined ? [{ code: ToolWarningCode.VERSION_NOT_PROVIDED, … }] : []`; в `manage-sprint-lifecycle.tool.ts` предупреждения формируются только из `ResponseFieldFilter.toWarnings(fieldsWithoutValue)`, ветки по `version` нет; `grep -rn VERSION_NOT_PROVIDED src` даёт ровно два инструмента из трёх, использующих `readCurrentVersion`
- **verification**: confirmed
- **verification_note**: проверено grep-ом по `src` (два потребителя кода предупреждения) и чтением обоих инструментов; интеграционный тест `manage-sprint-lifecycle.tool.integration.test.ts:50` подаёт happyPath без `version` и проходит, что возможно только при отсутствии warnings
- **fix_direction**: выровнять поведение трёх операций класса «версия дочитывается»: либо отдавать то же предупреждение и в lifecycle, либо вынести решение в общее место, чтобы следующий инструмент этого класса не получил его по забывчивости; happyPath интеграционного теста тогда придётся вести с явной `version`, как это сделано у `update_sprint`

---

### claude-03

- **reviewer**: claude
- **severity**: MEDIUM
- **kind**: pattern
- **domain**: tests
- **title**: Тип и тесты стороны ответа `manage_queue_access` описывают форму `GET`, а живьём у `PATCH` наблюдалась только `{self, version}`
- **mechanism**: Отчёт живого прогона утверждает прямо: «`PATCH` отвечает **только** `{ self, version }`, без единого разрешения. Полную форму… отдаёт `GET` того же ресурса». Комментарий сущности утверждает обратное — что `PATCH` отвечает той же формой, что и `GET`, — и ссылается при этом на файл инвентаря, который снят с `GET`. Happy-path интеграционного теста мокает ответ `PATCH` полной формой (`createQueuePermissionsFixture()` с записью `write` и вложенными пользователями) и утверждает `permissions.write?.users?.[0]?.display` — то есть закрепляет как норму форму, которой у `PATCH` живьём не видели. Реально наблюдённая форма проверена лишь отдельным `it` в конце файла. Практическое следствие: набор `fields` по умолчанию (`STANDARD_QUEUE_PERMISSION_FIELDS` содержит `write.users.display`) в бою будет давать `FIELDS_WITHOUT_VALUE`, а тесты этого не показывают.
- **trigger**: воспроизводится в нормальной работе — любой боевой вызов инструмента с полями вложенных разрешений
- **in_scope**: да
- **anchor**: `src/tracker_api/entities/queue-permission.entity.ts:1-9`; `tests/integration/tools/api/queues/access/manage-queue-access.tool.integration.test.ts:47-72,110-120`; `tests/helpers/test-fields.ts:70-75`
- **evidence**:
  ```ts
  // queue-permission.entity.ts:5-8
  // ...; `PATCH` отвечает той же формой, что и `GET` того же ресурса).
  ```
  против `0_LIVE_RUN_REPORT_2026-08-26.md`, раздел «Форма ответа `PATCH …/permissions` — снята живьём»: «`PATCH` отвечает **только** `{ self, version }`»
- **verification**: confirmed
- **verification_note**: расхождение сверено дословно: файл инвентаря `queue-permissions-response-2026-08-26.json` содержит `create/write/read/grant` и, по тексту отчёта, снят с `GET`; ни одного зафиксированного ответа `PATCH` с разрешениями в материалах нет
- **fix_direction**: привести утверждение комментария к наблюдённому (полная форма — у `GET`, у `PATCH` наблюдалась только версия) и поменять местами роли кейсов в тесте: наблюдённая форма — основной happy path, полная — дополнительный кейс «инструмент переживает и полную форму»; заодно пересмотреть состав `STANDARD_QUEUE_PERMISSION_FIELDS`, чтобы дефолт тестов не расходился с тем, что боевой `PATCH` реально отдаёт

---

### claude-04

- **reviewer**: claude
- **severity**: MEDIUM
- **kind**: pattern
- **domain**: architecture
- **title**: `readCurrentVersion` продублирован дословно в трёх операциях
- **mechanism**: Один и тот же приватный метод (GET сущности, проверка `typeof version !== 'number'`, исключение с тем же текстом, тот же комментарий про `?version=undefined`) скопирован в три операции. Различаются только путь и слово «спринта/компонента». Класс «версия обязательна» по материалам плана растёт (компонент, спринт, lifecycle спринта, на очереди — глобальные поля после закрытия D10), значит четвёртая копия — вопрос времени. Дублирование ниже порога `cpd` (5%) и потому машинно не ловится.
- **trigger**: недостижим (дефект сопровождения, не поведения)
- **in_scope**: да
- **anchor**: `src/tracker_api/api_operations/sprint/update-sprint.operation.ts:62-77`, `src/tracker_api/api_operations/sprint/manage-sprint-lifecycle.operation.ts:71-86`, `src/tracker_api/api_operations/component/update-component.operation.ts:78-93`
- **evidence**: во всех трёх — `const version = <entity>.version; if (typeof version !== 'number') { throw new Error(…'Передай version параметром инструмента.') }`, отличается только имя сущности в сообщении и путь GET
- **verification**: confirmed
- **verification_note**: три файла прочитаны целиком, тела методов совпадают построчно с точностью до имени сущности
- **fix_direction**: поднять чтение версии в общее место операций (`BaseOperation` или отдельный помощник «версия ресурса по пути»), оставив на вызывающей стороне только путь и метку сущности; текст исключения и проверка типа тогда живут в одном месте, и следующий инструмент класса получает их даром

---

### claude-05

- **reviewer**: claude
- **severity**: MEDIUM
- **kind**: contract
- **domain**: reliability
- **title**: Обещанная планом защита «version не уйдёт в тело» реализована только в инструменте — операция шлёт `data` как есть
- **mechanism**: План пакета B: «`version` не должен остаться в теле, и типом это не гарантируется… Гарантию даёт явная деструктуризация в инструменте **и операции** — и тест, сверяющий тело». В инструменте деструктуризация есть, в `UpdateSprintOperation.execute` — нет: `data` уходит в `httpClient.patch` без разбора, а `UpdateSprintDto` несёт индексную сигнатуру `[key: string]: unknown`, из-за которой тип ключ `version` не запрещает. Фасад и сервис теперь принимают `UpdateSprintDto` целиком (раньше был `Omit<…, 'sprintId'>`), то есть любой не-MCP вызывающий (`facade.updateSprint(id, { version: 5 })`) получит `400 version: Incorrect data format` — ровно тот дефект, который чинил пакет. Тест «version не попадает в тело PATCH» проверяет операцию с уже очищенным входом и такой вход не ловит.
- **trigger**: недостижим через MCP-инструмент (единственный текущий вызывающий чистит вход); достижим для любого нового вызывающего фасада
- **in_scope**: да
- **anchor**: контракт `UpdateSprintOperation.execute(sprintId, data, version?)` — `src/tracker_api/api_operations/sprint/update-sprint.operation.ts:38-45`, `src/tracker_api/dto/sprint/update-sprint.dto.ts:28-29`
- **evidence**:
  ```ts
  const sprint = await this.httpClient.patch<SprintOutput>(
    `/v3/sprints/${sprintId}?version=${effectiveVersion}`,
    data
  );
  ```
- **verification**: confirmed
- **verification_note**: операция прочитана целиком — ни деструктуризации, ни удаления ключа в ней нет; требование «и операции» взято дословно из `1_PLAN.md`, пакет B
- **fix_direction**: снять `version` из тела на стороне операции (явно, не типом) и покрыть тестом операции вход, где `version` присутствует в `data`, — иначе гарантия держится на дисциплине единственного вызывающего

---

### claude-06

- **reviewer**: claude
- **severity**: MEDIUM
- **kind**: point
- **domain**: reliability
- **title**: `subjectsProcessed` выдаёт отправленное за применённое, хотя живая проба показала успешный ответ без эффекта
- **mechanism**: Поле называется «обработано», но вычисляется как `subjects.length` — это счётчик ОТПРАВЛЕННЫХ субъектов, никак не сверенный с ответом. Живой прогон в том же заходе задокументировал случай, когда API отвечает 200 и не делает ничего (`permission: 'read'`: «`read.users` остался пуст, версия не изменилась» — дважды, с чтением состояния до и после). Инструмент в этом сценарии рапортует `subjectsProcessed: 1`, и вызывающий агент получает подтверждение эффекта, которого не было. Контракт вокруг поля переписан этим заходом целиком (вход, тело, тип ответа), а само поле осталось не пересмотренным.
- **trigger**: воспроизводится в нормальной работе — `permission: 'read'` на открытой на чтение очереди, задокументированный случай прогона
- **in_scope**: нет (строка не менялась; переписан весь контракт вокруг неё)
- **anchor**: `src/tools/api/queues/manage-queue-access.tool.ts:55-60`
- **evidence**:
  ```ts
  subjectsProcessed: subjects.length,
  ```
- **verification**: confirmed
- **verification_note**: значение читается напрямую из входа, ответ API на него не влияет — проверено чтением инструмента; факт «200 без эффекта» — из `0_LIVE_RUN_REPORT_2026-08-26.md`, раздел «Открыто: `permission: 'read'` не даёт эффекта»
- **fix_direction**: либо переименовать поле так, чтобы оно означало отправленное (и тем перестало обещать эффект), либо выводить его из ответа — например, из наличия субъекта в соответствующей записи разрешения, — а невозможность такого вывода у `PATCH` (см. claude-03) назвать в описании инструмента

---

### claude-07

- **reviewer**: claude
- **severity**: MEDIUM
- **kind**: contract
- **domain**: security
- **title**: `manage_queue_access` остаётся `destructiveHint: false` при том, что контракт этого захода добавил `deny` и снятие доступов у групп и ролей
- **mechanism**: Аннотации MCP — то, по чему клиент решает, спрашивать ли подтверждение. Инструмент способен снять доступ (`action: 'remove'`) и, после этого захода, явно запретить его (`permission: 'deny'`) пользователям и группам целой очереди — самая разрушительная мутация Трекера по формулировке собственного теста рубежа («Правка доступов боевой очереди — самая разрушительная мутация Трекера», `tests/live_scope/organization-rules.test.ts`). При этом `destructiveHint: false` и `requiresExplicitUserConsent: false` остались нетронутыми, хотя набор возможных действий расширился.
- **trigger**: воспроизводится в нормальной работе — вызов с `action: 'remove'` либо `permission: 'deny'` на боевой очереди вне живого прогона (рубеж живых прогонов боевой контур не защищает)
- **in_scope**: да (контракт инструмента переписан этим диффом; конкретная строка аннотаций не менялась)
- **anchor**: `src/tools/api/queues/manage-queue-access.metadata.ts:30-35`
- **evidence**:
  ```ts
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  ```
  при `permission: z.enum(['create','write','read','grant','deny'])` и `action: z.enum(['add','remove'])` в схеме
- **verification**: confirmed
- **verification_note**: аннотации прочитаны в файле метаданных, набор действий — в схеме; сопоставление с семантикой `destructiveHint` из спецификации MCP («может выполнять разрушительные обновления»)
- **fix_direction**: пересмотреть аннотации под новый контракт — как минимум `destructiveHint: true`; вопрос о `requiresExplicitUserConsent` решить явно и записать решение рядом, чтобы следующий заход не считал текущее значение случайным

---

### claude-08

- **reviewer**: claude
- **severity**: LOW
- **kind**: point
- **domain**: style
- **title**: `redactionAllowlist` инструмента `manage_sprint_lifecycle` не приведён к новому составу схемы
- **mechanism**: Пакет B добавил инструменту параметры `version` и `fields`, allow-list остался `['sprintId', 'action']`. Оба новых параметра — безоговорочно безопасные (число версии и список имён полей), у всех соседних инструментов спринта `fields` в списке есть. Следствие — в логе вместо значений окажутся маркеры формы, то есть разбор инцидента теряет ровно те два параметра, которые в этом заходе и стали причиной отказов `428`. План пакета A прямо требовал приводить allow-list к составу схемы у затронутых инструментов и называл этот дрейф отдельно.
- **trigger**: воспроизводится в нормальной работе (деградация диагностики, не поведения)
- **in_scope**: да
- **anchor**: `src/tools/api/sprints/manage-sprint-lifecycle.metadata.ts:24`
- **evidence**:
  ```ts
  redactionAllowlist: ['sprintId', 'action'],
  ```
  против `update-sprint.metadata.ts`: `['sprintId', 'version', 'startDate', 'endDate', 'status', 'fields']`
- **verification**: confirmed
- **verification_note**: сверено со схемой инструмента (`version`, `fields` объявлены) и с allow-list соседей по семейству спринта
- **fix_direction**: добавить `version` и `fields` в allow-list этого инструмента; машинный барьер на соответствие allow-list составу схемы уже назван планом как отдельная задача — здесь достаточно привести затронутое

---

### claude-09

- **reviewer**: claude
- **severity**: LOW
- **kind**: point
- **domain**: style
- **title**: Комментарий DTO утверждает, что `version` у `delete` игнорируется, тогда как схема её отклоняет
- **mechanism**: В `manage-sprint-lifecycle.schema.ts` заведён `.refine()`, отклоняющий `version` при `action: 'delete'` — и это объяснено там же именно как отказ от молчаливого игнорирования. Комментарий поля в DTO говорит «У `delete` игнорируется», то есть описывает поведение, которое схема специально запрещает. Читатель DTO получает противоположное представление о контракте.
- **trigger**: недостижим (расхождение документации, не поведения)
- **in_scope**: да
- **anchor**: `src/tracker_api/dto/sprint/manage-sprint-lifecycle.dto.ts:28-31`
- **evidence**:
  ```ts
  * `archive`. Не передана — операция читает текущую версию сама. У `delete` игнорируется.
  ```
  против `manage-sprint-lifecycle.schema.ts`: `.refine((data) => !(data.action === 'delete' && data.version !== undefined), …)`
- **verification**: confirmed
- **verification_note**: оба файла прочитаны; интеграционный тест «delete: version в параметрах инструмента отклоняется валидацией до HTTP» подтверждает, что верна схема, а не комментарий
- **fix_direction**: переписать комментарий под фактический контракт — на уровне инструмента `version` с `delete` отклоняется, на уровне операции (куда можно попасть в обход схемы) не используется

---

### claude-10

- **reviewer**: claude
- **severity**: LOW
- **kind**: point
- **domain**: tests
- **title**: Фикстура «форма смоука референсного клиента» добавляет `self`, которого в цитируемом источнике нет, а тип объявляет его обязательным
- **mechanism**: Комментарий фикстуры и комментарий сущности ссылаются на смоук референсного клиента, где ответ мокается как `{"version": 11}` — без `self`. Фикстура при этом возвращает `{self, version}`, а `QueuePermissions` объявляет `self: string` обязательным. То есть та самая «минимальная законная форма», ради которой заведён отдельный кейс, в коде не воспроизводится и типом запрещена; кейс проверяет форму на один ключ богаче наблюдённой.
- **trigger**: недостижим в текущем коде (типы времени выполнения не проверяются), но кейс не покрывает то, что декларирует
- **in_scope**: да
- **anchor**: `tests/helpers/queue-permission.fixture.ts:86-98`, `src/tracker_api/entities/queue-permission.entity.ts:55-56`
- **evidence**:
  ```ts
  export function createVersionOnlyQueuePermissionsFixture(version = 11) {
    return { self: 'https://api.tracker.yandex.net/v3/queues/TEST/permissions', version };
  }
  ```
  при комментарии «форма, которую мокает смоук-тест референсного клиента (`{"version": 11}`)»
- **verification**: confirmed
- **verification_note**: расхождение между текстом комментария и телом функции видно непосредственно; обязательность `self` — в интерфейсе сущности
- **fix_direction**: либо привести фикстуру к цитируемой форме (только версия) и ослабить обязательность `self` в типе, либо перестать называть её формой смоука референсного клиента и описать как наблюдённый ответ `PATCH`

---

### claude-11

- **reviewer**: claude
- **severity**: LOW
- **kind**: point
- **domain**: style
- **title**: `ACTION_MESSAGES` типизирован `Record<string, string>` — компилятор не следит за полнотой по `action`
- **mechanism**: Ключом карты служит замкнутый enum схемы (`'start' | 'archive' | 'delete'`), но объявлена она как `Record<string, string>`. Добавление четвёртого действия в схему не вызовет ошибки компиляции, а даст `undefined` внутри интерполяции сообщения пользователю. Проект держит строгую типобезопасность как правило (корневой `CLAUDE.md`, §4).
- **trigger**: недостижим сегодня; срабатывает при расширении enum действий
- **in_scope**: да
- **anchor**: `src/tools/api/sprints/manage-sprint-lifecycle.tool.ts:13-17`
- **evidence**:
  ```ts
  const ACTION_MESSAGES: Record<string, string> = { start: 'запущен', archive: 'архивирован', delete: 'удалён' };
  ```
- **verification**: confirmed
- **verification_note**: тип объявлен явно в файле; тип `SprintLifecycleAction` существует и экспортируется из DTO
- **fix_direction**: ключевать карту типом действия (`SprintLifecycleAction`), чтобы полнота проверялась компилятором

---

## Coverage

Просмотрено и признано чистым (без находок):

- **Пакет A (снятие параметров).** `update-board.schema/metadata/dto`, `create-sprint.schema/metadata/dto`, `update-sprint.schema/metadata/dto`: `country`, `startDateTime`, `endDateTime` сняты из всех трёх слоёв, комментарии-причины несут код ответа и дату пробы, `redactionAllowlist` у этих трёх инструментов приведён к составу схемы (у `update_board` заодно убран протухший `version`). `grep` по `src`/`tests`/`scripts` не находит остатков этих имён нигде, кроме комментариев-причин и `sprint.entity.ts` (поля ответа — оставлены осознанно и планом).
- **Пакет B (версия в query).** Обе операции, оба инструмента, сервис и фасад; проверены: путь с `?version=`, отсутствие лишнего GET при переданной версии, исключение вместо `?version=undefined`, отсутствие инвалидации кеша при ошибке, `delete` без GET и без версии. Юнит-тесты операций и интеграционные тесты покрывают все кейсы, названные планом, включая объявление подготовительного GET в `expectedRequests` и в `arrange` ветвей `forbidden`/`notFound`. Решение «ошибку несёт PATCH/POST, а не GET» названо в шапке тестов явно.
- **Рубеж живых прогонов.** `canonicalRequestPath` срезает query до сопоставления — путь с `?version=` по-прежнему ловится правилом спринта (и это закреплено в `known-mutating-requests.ts`). Снятие `version` из `SPRINT_KEYS` согласовано с тем, что инструменты больше не шлют её телом. Новый трёхуровневый разбор тела доступов очереди (разрешение → вид субъекта → действие) отклоняет неизвестное на каждом уровне; старая форма `{роль: {действие: […]}}` отклоняется и покрыта тестом; правка доступов возможна только для очереди из журнала прогона, поэтому боевая песочная очередь `TEST` для доступов недостижима; проверка людей у `groups`/`roles` снята обоснованно (числовые id и идентификаторы ролей людьми не являются) и покрыта тестами. Ослаблений рубежа, кроме claude-01, не найдено.
- **Пакет C (контракт `manage_queue_access`).** Вход: три `.refine()` (deny+roles, числовые id групп, справочник ролей) — покрыты юнит-тестами до HTTP; сужение мультиформы объявлено решением в комментарии схемы и DTO. Тело запроса строится ровно как документировано, группы уходят числом (проверено отдельным тестом). Выход: тип и фикстуры соответствуют файлу инвентаря, `deny` помечен непроверенным честно, отсутствие разрешений переживается без исключения, вложенный путь проходит `ResponseFieldFilter`. Оговорки по стороне ответа — claude-03 и claude-10.
- **Пакет D (сверка и документация).** `LIVE_VERIFIED_KEYS` пополнен ровно теми ключами, которые отчёт живого прогона объявляет доехавшими; снятые пакетом A ключи в белый список не попали. Перегенерированные `outgoing-requests.md` и `doc-route-sweep.md` бьются с изменениями кода (в том числе `?version=` в путях спринта и `create` вместо `queue-lead` у доступов). `3_OPEN_ITEMS.md`, `TESTING_STRATEGY.md`, README сервера, README сущностей и операций обновлены под новые контракты; `CHANGELOG.md` руками не тронут.
- **Швы между пакетами.** Файлы, правленные разными агентами (`organization-rules.ts`, `update-sprint.dto.ts`, `yandex-tracker.facade.ts`, `manage-queue-access.schema.ts`, `mock-server.ts`, `known-mutating-requests.ts`), прочитаны целиком в рабочем дереве: следов частичной правки, потерянных изменений или взаимно противоречащих комментариев не найдено. Осиротевших моков не осталось — `mockManageQueueAccessSuccess/403` удалены вместе с переводом теста на `describeToolIntegration`, строка снята из `LEGACY_MOCK_TEST_PATHS`, baseline уменьшен с 30 до 29.
- **Тесты, фиксирующие старое поведение.** Целенаправленный поиск: `grep` по `startDateTime|endDateTime|queue-lead|team-member` в `src`/`tests`/`scripts` — остатки только в комментариях-причинах и в тестах, где старое значение используется КАК отклоняемое. Тесты фасада, сервиса и операций переписаны под новые сигнатуры. Зелёного теста, закрепляющего снятое поведение, не найдено; единственный случай закрепления нежелательного поведения — claude-02.

Не проверено (и почему):

- `npm run validate:quiet` самостоятельно не запускался — ревью read-only, зелёная валидация принята со слов задания; выводы о компиляции опираются на чтение кода.
- Живые пробы не воспроизводились: доступ к боевому API в ревью не используется. Все утверждения об ответах API взяты из отчёта прогона и файла инвентаря и помечены как таковые.
- Поведение API на смешанном теле из claude-01 (`{add: […], id: …}` в одном объекте) — не проверено; проверить можно только живой пробой.
- Пакет E (потульное исключение в матрице покрытия) в материал не входит — отложен решением пользователя.

## Отклонённые находки (refuted)

- Кандидат | Правка доступов боевой очереди `TEST` могла бы снять доступ у группы «Все сотрудники» через новый `permission: 'deny'` | правило доступов очереди требует записи в журнале прогона (`ownershipRule(…, 'queue', …)`), а песочная очередь прогоном не создаётся — достижима только одноразовая очередь прогона; покрыто тестом «доступы чужой очереди отклоняются».
- Кандидат | Обёртка `{add|remove}` открывает дыру в `manage_queue_access` — «чужой человек перестал распознаваться» | нет: для тела, которое строит операция, чужой логин в `users` по-прежнему ловится (`personRefs` возвращает содержимое `add`/`remove`, и оно сверяется с владельцем прогона) — подтверждено тестом `write.users.remove: [FOREIGN_PERSON]`. Дыра существует, но в другой форме и в другом семействе — вынесена в claude-01, а не отклонена.
