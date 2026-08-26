# План починки дефектов живого прогона §7 (2026-08-26)

Основание — `0_LIVE_RUN_REPORT_2026-08-26.md`. Перечень затронутых артефактов снят
механически: `inventory/artefacts-2026-08-26.md` (там же назван способ и его слепые пятна).

**Редакция 2 — после ревью плана.** Находки ревью перепроверены по коду и приняты;
что именно изменилось и почему — `2_REVIEW_RESOLUTION.md`.

Пакеты идут **последовательно**: наборы файлов пересекаются по построению
(`organization-rules.ts` у A, B и C; `update-sprint.dto.ts` у A и B;
`yandex-tracker.facade.ts` и `mock-server.ts` у B и C).

---

## Пакет A — снять параметры, которые гарантируют отказ

`country` у правки доски, `startDateTime`/`endDateTime` у создания и правки спринта.
Прецедент тот же, что у `update_board.version` и `create_queue.issueTypes`:
необязательный параметр, любое значение которого роняет запрос, — не возможность, а
мина. Поля остаются в сущностях (`board.entity.ts`, `sprint.entity.ts`): в **ответе**
они есть и читаются.

**Файлы:**
- `src/tools/api/boards/update-board.schema.ts`, `update-board.metadata.ts`
- `src/tracker_api/dto/board/update-board.dto.ts`
- `src/tools/api/sprints/create-sprint.schema.ts`, `create-sprint.metadata.ts`
- `src/tools/api/sprints/update-sprint.schema.ts`, `update-sprint.metadata.ts`
- `src/tracker_api/dto/sprint/create-sprint.dto.ts`, `update-sprint.dto.ts`
- `src/live_scope/organization-rules.ts` — `BOARD_KEYS` без `country`,
  `SPRINT_KEYS` без `startDateTime`/`endDateTime`
- `tests/integration/tools/api/boards/**`, `tests/integration/tools/api/sprints/**`

**Комментарий в каждой схеме** — причина снятия, код ответа и дата пробы, как это уже
сделано для `version` доски. Без причины следующий заход вернёт параметр обратно.

**`redactionAllowlist` приводится к составу схемы** у обоих затронутых инструментов.
Он уже гниёт независимо от этого плана: `update-board.metadata.ts` до сих пор
перечисляет `version`, снятый в 4.0.0. Машинного барьера на соответствие нет
(`tests/smoke/tool-redaction-allowlist.smoke.test.ts` покрывает два инструмента из 85) —
завести его отдельной задачей, здесь только привести в порядок затронутое.

**DoD:** `grep -rn "country" src/tools/api/boards src/tracker_api/dto/board` и
`grep -rn "DateTime" src/tools/api/sprints src/tracker_api/dto/sprint` не находят
ничего, кроме комментариев-причин; `npm run validate:quiet` зелёный.

---

## Пакет B — версия спринта уходит query-параметром

Сломан не один инструмент, а предмет «спринт» целиком:

| Запрос | Версия | Живая проба |
|---|---|---|
| `PATCH /v3/sprints/{id}` (`update_sprint`) | обязательна | `428` без неё, `400` с ней в теле |
| `POST /v3/sprints/{id}/_start` (`manage_sprint_lifecycle`) | обязательна | `428`, параметра у инструмента нет вовсе |
| `POST /v3/sprints/{id}/_archive` (`manage_sprint_lifecycle`) | обязательна | `428`, параметра нет вовсе |
| `DELETE /v3/sprints/{id}` (`manage_sprint_lifecycle`) | не нужна | 200, спринт `237` удалён |

Рабочая форма названа самим API в тексте отказа: «параметр 'версия' либо заголовок
If-Match». Берём query-параметр — ровно как у `UpdateComponentOperation` после
починки, чтобы у операций одного класса не разъезжался способ.

**Контракт:**

```
UpdateSprintOperation.execute(sprintId, data, version?): Promise<SprintOutput>
// PATCH /v3/sprints/{sprintId}?version={effective}
// effective = version ?? await readCurrentVersion(sprintId)   // GET /v3/sprints/{sprintId}
// версия не прочиталась числом — исключение с указанием передать version параметром

ManageSprintLifecycleOperation: та же схема для `_start` и `_archive`;
`delete` версию не шлёт — она там не требуется, и лишний GET был бы платой ни за что.
```

`version` становится параметром и у `manage_sprint_lifecycle`: передавшему его лишний
GET не делается, и там работает настоящая оптимистичная блокировка.

**`version` не должен остаться в теле, и типом это не гарантируется.**
`UpdateSprintDto` несёт индексную сигнатуру `[key: string]: unknown`, из-за чего
`Omit<UpdateSprintDto, 'version'>` схлопывается в неё же и ничего не запрещает.
Гарантию даёт явная деструктуризация в инструменте и операции — и тест, сверяющий тело.

**`version` снимается из `SPRINT_KEYS`** рубежа (`organization-rules.ts`): после
пакета инструмент его телом не шлёт, а белый список, разрешающий несуществующий ключ,
— ровно тот дрейф, ради которого список заведён.

**Файлы:** `src/tracker_api/api_operations/sprint/update-sprint.operation.ts`,
`manage-sprint-lifecycle.operation.ts`,
`src/tracker_api/dto/sprint/manage-sprint-lifecycle.dto.ts`,
`src/tracker_api/facade/services/sprint.service.ts`,
`src/tracker_api/facade/yandex-tracker.facade.ts`,
`src/tools/api/sprints/update-sprint.tool.ts`,
`src/tools/api/sprints/manage-sprint-lifecycle.{schema,metadata,tool}.ts`,
`src/live_scope/organization-rules.ts`,
`tests/tracker_api/api_operations/sprint/*.test.ts`,
`tests/integration/tools/api/sprints/*.integration.test.ts`.

**Интеграционные тесты — работа больше, чем «дописать query».** Оснастка
`describeToolIntegration`/`ApiExpectationSet` отвергает незаявленный запрос и
незаявленный query-ключ. Подготовительный `GET /v3/sprints/{id}` придётся объявить и в
верхнеуровневом `expectedRequests`, и в `arrange` каждого кейса, включая
`errors.forbidden` и `errors.notFound` — там ещё нужно решить, какой из двух запросов
отвечает ошибкой (решение назвать в отчёте).

**Кейсы:** версия передана — GET не делается, в URL уходит она; версия не передана —
ровно один GET, в URL уходит прочитанная; ответ без числовой версии — названное
исключение, а не `?version=undefined`; `version` отсутствует в теле; подготовительный
GET объявляет `apiVersion: 'v3'` (С-4); путь с query по-прежнему сопоставляется
правилом спринта в рубеже (`canonicalRequestPath` срезает query — сейчас не проверено
ничем); `delete` версию не шлёт и лишнего GET не делает; ошибка PATCH после
прочитанной версии не инвалидирует кеш спринта.

**DoD:** названные кейсы зелёные; `npm run validate:quiet` зелёный.

---

## Пакет C — переработать контракт `manage_queue_access`

Инструмент неверен целиком: вход, тело запроса и тип ответа. Документированная форма —
`{ <разрешение>: { users|groups|roles: [...] | { add|remove: [...] } } }`.
«Роли» нашей схемы (`queue-lead`, `team-member`, `follower`, `access`) разрешениями не
являются — отсюда `400` на каждой из четырёх.

Пакет разбит надвое, потому что **успешного ответа этого эндпоинта никто ещё не
видел**: прогон получил `400` на каждой попытке. Типизировать ответ по документации —
ровно тот способ, которым заведена вся разбираемая серия дефектов.

### C1 — сторона запроса

```
ManageQueueAccessParamsSchema = {
  queueId:     string,
  permission:  'create' | 'write' | 'read' | 'grant' | 'deny',
  subjectKind: 'users' | 'groups' | 'roles',
  action:      'add' | 'remove',
  subjects:    (string | number)[],   // логины/uid, ЧИСЛОВЫЕ id групп, идентификаторы ролей
  fields:      FieldsSchema,
}
.refine(deny + roles → отказ)   // «Для поля deny доступны только users и groups»
// тело: { [permission]: { [subjectKind]: { [action]: subjects } } }
```

Справочник назначаемых ролей — `author`, `assignee`, `follower`, `access`
(документация, раздел «Допустимые идентификаторы»). `queue-lead` в ответах встречается,
но назначаемой ролью не объявлен — в перечень не берём и пишем почему.

**Сужение контракта объявляется решением, а не остаётся молчанием.** Форма «одно
разрешение × один вид субъекта × одно действие» отрезает документированную
мультиформу (несколько разрешений за запрос) и форму-замену `users: [...]` без
`add`/`remove`. Причина — предсказуемость инструмента для агента; записать в комментарий
схемы, иначе следующий заход вернёт мультиформу как «недоделку».

**Рубеж прогона правится в двух местах, а не в одном.** Белый список ключей тела
становится перечнем разрешений, вложенный — перечнем `users|groups|roles`.
И отдельно — `people-in-body.ts`: `personRefs` не понимает обёртку `{add|remove}` и
вернёт «ссылка на человека не распознана» на **любом** новом теле, потому что `users`
входит в `PERSON_FIELDS`, а обход тела глобальный (`live-scope.guard.ts`, до всех
правил семейства). Утверждение «гейт людей рекурсивен и распространяется сам» неверно —
проверено чтением `personRefs`. Научить `personRefs` обёртке `{add|remove}` — часть
пакета.

**Файлы C1:** `src/tools/api/queues/manage-queue-access.{schema,metadata,tool}.ts`,
`src/tracker_api/dto/queue/{manage-queue-access.dto,dto.factories,index}.ts`,
`src/tracker_api/api_operations/queue/manage-queue-access.operation.ts`,
`src/live_scope/{organization-rules,people-in-body}.ts`,
`tests/helpers/queue-dto.fixture.ts`,
`tests/tools/api/queues/manage-queue-access.tool.test.ts`,
`tests/tracker_api/api_operations/queue/manage-queue-access.operation.test.ts`,
`tests/live_scope/{organization-rules.test.ts,known-mutating-requests.ts}`.

### C2 — сторона ответа, после живого наблюдения

Форма ответа выясняется живой пробой (раздел «Живая проверка»), и только затем
переписываются `QueuePermissionsOutput`, `queue-permission.entity.ts` и
`ManageQueueAccessOutputDataSchema`. Известно заранее, что документация и референсный
клиент расходятся: `Permissions.fields` в `yandex_tracker_client/collections.py`
перечисляет `self/create/read/write/grant` **без** `deny`, а мок ответа в его смоук-тестах
— вообще `{"version": 11}`. Значит инструмент обязан пережить ответ, состоящий из одной
версии, и `deny` до наблюдения помечается непроверенным.

**Файлы C2:** `src/tracker_api/dto/queue/queue-permissions.output.ts`,
`src/tracker_api/entities/{queue-permission.entity.ts,index.ts}`,
`src/tools/api/queues/manage-queue-access.schema.ts` (выходная часть),
`src/tracker_api/facade/{services/queue.service.ts,yandex-tracker.facade.ts}`,
`src/tracker_api/entities/README.md`, `src/tracker_api/api_operations/README.md`,
`tests/helpers/{queue-permission.fixture.ts,test-fields.ts}`,
`tests/integration/helpers/mock-server.ts`,
`tests/integration/tools/api/queues/access/manage-queue-access.tool.integration.test.ts`,
`tests/coverage-exceptions/legacy-mock-tests.ts`.

`tests/helpers/test-fields.ts` несёт `STANDARD_QUEUE_PERMISSION_FIELDS =
['id','self','display']` — под новую форму ответа не годится. Если интеграционный тест
переводится на `describeToolIntegration`, из `legacy-mock-tests.ts` снимается строка и
уменьшается `LEGACY_MOCK_TEST_BASELINE_COUNT` (сейчас 30), иначе
`validateLegacyMockTestList` упадёт.

**Кейсы:** тело для каждого из пяти разрешений и трёх видов субъекта; группа уходит
числом, а не строкой; `deny` + `roles` отклоняется схемой **до** HTTP; роль вне
справочника отклоняется схемой; чужой человек в `subjects` отклоняется рубежом;
`groups`/`roles` людьми **не** считаются; СТАРАЯ форма тела (`{'queue-lead': {add: […]}}`)
теперь обязана отклоняться рубежом — иначе рубеж и инструмент разъедутся молча;
вложенный путь ответа проходит `ResponseFieldFilter` (`create.users.display`), а старый
набор полей даёт `FIELDS_WITHOUT_VALUE`, а не пустой успех; ответ `{version}` без
разрешений инструмент переживает без исключения.

**Это ломающее изменение публичного контракта** — разрешено пользователем явно.

---

## Пакет D — сверка и документация

- `scripts/sweep-doc-routes.ts`, `LIVE_VERIFIED_KEYS`: добавить
  `update_issue.assignee`, `update_worklog.start`,
  `update_board.orderBy|orderAsc|useRanking`, `create_sprint.status`.
  Снятые пакетом A ключи в белый список **не** попадают — их больше нет в запросе.
- `npm run enumerate:requests` и `npm run sweep:doc-routes` — перегенерировать
  `outgoing-requests.md` и `doc-route-sweep.md`.
- `tests/TESTING_STRATEGY.md`: в разбор сверки добавить, что имя из раздела ответа за
  параметр запроса не считается, и `startDateTime` — доказанный пример.
- `.agentic-planning/plan_tracker_route_sweep_fixes/3_OPEN_ITEMS.md`: §7 закрыть с
  исходами; `update_global_field.options/suggest` перенести в §1 к D10.
- `README.md` сервера — под изменившийся контракт `manage_queue_access`.
- **`CHANGELOG.md` руками не править**: он генерируется `@semantic-release/changelog`.
  Ломающее изменение доносится футером `BREAKING CHANGE:` в коммите пакета C, а мерж —
  `--no-ff` сообщением из файла: squash футер съедает (проверено на 4.0.0).
- `manifest.json` схем инструментов не содержит — из области пакета убран.

**DoD:** `npm run validate:quiet` зелёный; повторная сверка не показывает снятых ключей.

---

## Пакет E — потульное исключение в матрице покрытия (отдельная задача)

`COVERAGE_MATRIX.md` **генерируется**, и пометку «живьём не наблюдается никогда» руками
не снять: `scripts/build-coverage-matrix.ts` ставит её из `isLiveExempt`, а тот читает
`tests/coverage-exceptions/live-exempt-categories.ts`, где исключение задано
**категориями целиком** (`api/boards`, `api/sprints`, `api/fields`, `api/entities`,
`api/filters`, `api/queues`). Механизма «снять у двух инструментов» нет; удаление
категории перевернёт С-5 и С-4 у всех инструментов категории разом.

При этом посылка исключения устарела шире, чем на два инструмента: допуск по владению
прогоном (этап 5.1) сделал наблюдаемыми доски, спринты, фильтры и очереди — все они
наблюдались живьём 25 и 26 августа. Не наблюдаются по-прежнему только глобальные поля
(упирается в D10) и записи Entity API.

Поэтому E — самостоятельная задача, а не пункт документации: завести потульное
исключение, перевести на него список, перегенерировать матрицу.
Отдельно: `npm run coverage:check` **не входит** в `validate`, поэтому расхождение
матрицы с кодом сейчас молчит — это и есть причина, по которой посылка устарела
незамеченной.

**Пакет E можно отложить**, но тогда решение записывается явно, а не подразумевается.

---

## Решения пользователя (2026-08-26)

- **Пакет E отложен** отдельной задачей: он трогает генератор матрицы и список
  исключений — свой набор файлов и своё ревью, — и в этом заходе ничего не
  разблокирует. Открытый пункт заводится в `3_OPEN_ITEMS.md` соседнего плана.
- **Коммит идёт в `main`, релиз без необходимости не создаём.** Пуш в `main` = публикация
  (semantic-release), поэтому пакеты коммитятся локально, а момент пуша выбирает
  пользователь. Ломающий коммит несёт футер `BREAKING CHANGE:`, мерж — `--no-ff`.
- **`update_global_field.options`/`suggest` остаётся открытым пунктом**: проверить нечем,
  пока жив D10. В область этого плана не входит.

## Живая проверка после починки

Пакеты B, C1 и C2 проверяются тем же способом, каким вскрыты, — иначе починка остаётся
гипотезой.

**Прогон идёт под ТОЙ ЖЕ меткой `sweep7-2026-08-26` и тем же файлом журнала.**
Право на правку спринта `236` и доступов очереди `TESTSWEEPB` даёт только журнал, а он
подписан меткой и чужой не принимает: новая метка означает пустой журнал и отказ на
всех четырёх мутациях, что прочиталось бы как «починка не работает». Журнал прогона
цел и содержит `board 108`, `sprint 236`, `queue 36`/`TESTSWEEPB`, `filter 7`,
`queueLocalField sweep7Local`, задачу `TEST-25`.

Что проверяем:
- `update_sprint` на спринте `236` — без `version` (дочитывание) и с `version` (блокировка);
- `manage_sprint_lifecycle` `start` на `236` — тот же `428` больше не приходит;
- `manage_queue_access` на `TESTSWEEPB` — `create`/`write` на `users: ['vr']`, чтение
  `GET /v3/queues/TESTSWEEPB/permissions` до и после; **ответ PATCH записывается
  дословно** — он и есть вход пакета C2.

Пакет A живой пробы не требует: он снимает параметры, а их отсутствие проверяется
схемой, а не API.
