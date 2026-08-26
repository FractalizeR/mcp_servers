Рецензия завершена. Прочитал весь дифф (56 файлов), обязательный контекст (CLAUDE.md корневой и трекера, живой отчёт, план, разбор ревью, инвентарь ответа, BRIEF) и рабочее дерево вокруг швов. Ниже — находки по схеме, затем coverage.

Инструмента записи файла у меня в этом сеансе нет (нет write/edit/bash), поэтому отдаю находки текстом — фасилитатор может разложить их в `review/qwen.md`.

---

## Находки (по убыванию severity)

### qwen-01
- **reviewer**: qwen
- **severity**: MEDIUM
- **kind**: contract
- **domain**: style
- **title**: Комментарий entity утверждает, что `PATCH` отвечает той же формой, что и `GET`, — вопреки живой пробе
- **mechanism**: Пакет C2 сознательно типизировал ответ «по наблюдению, а не по документации»: живая проба зафиксировала, что `PATCH .../permissions` отвечает **только** `{self, version}` (без единого разрешения), а полную форму, ключёванную разрешением, отдаёт `GET`. Заголовок `queue-permission.entity.ts` при этом заявляет обратное — что `PATCH` отвечает той же формой, что и `GET`, и ссылается на инвентарный JSON, который на самом деле является ответом `GET` (полная форма). Это ровно тот класс дефекта («типизация по документации вместо наблюдения»), ради устранения которого затевался весь пакет; комментарий реинтро­дуцирует недокументированное допущение в том самом месте, где фикс был аккуратен. Читая его, будущий правщик может решить, что `manage_queue_access` после успешного `PATCH` возвращает заполненные разрешения, тогда как возвращает лишь `{self, version}`.
- **trigger**: воспроизводится в нормальной работе как фактор будущего риска — любой, кто будет дорабатывать выход инструмента, читает этот комментарий; функциональной поломки сегодня нет (все ключи разрешений в типе опциональны, отсутствие даёт `FIELDS_WITHOUT_VALUE`).
- **in_scope**: да
- **anchor**: `packages/servers/yandex-tracker/src/tracker_api/entities/queue-permission.entity.ts:4-8`
- **evidence**:
  ```typescript
   * снята живой пробой 2026-08-26 на очереди `TESTSWEEPB`
   * (`.agentic-planning/.../queue-permissions-response-2026-08-26.json`;
   * `PATCH` отвечает той же формой, что и `GET` того же ресурса).
  ```
  Контр-факт из `0_LIVE_RUN_REPORT_2026-08-26.md`: «`PATCH` отвечает **только** `{ self, version }`, без единого разрешения. Полную форму ... отдаёт `GET` того же ресурса».
- **verification**: confirmed
- **verification_note**: живой отчёт однозначно разделяет формы `PATCH` (минимальная) и `GET` (полная, она же в инвентарном JSON); фраза «той же формой» этому противоречит. Смягчающее чтение («обе суть объект `QueuePermissions`, а не массив») возможно, но формулировка вводит в заблуждение именно относительно заполненности ключей.
- **fix_direction**: переписать фразу так, чтобы она отражала наблюдение: `PATCH` возвращает только `{self, version}`, полную форму отдаёт `GET`; пометить, что инвентарный JSON — это ответ `GET`. Аналогично выверить формулировку в `src/tracker_api/entities/README.md`.

---

### qwen-02
- **reviewer**: qwen
- **severity**: LOW
- **kind**: point
- **domain**: reliability
- **title**: `manage_sprint_lifecycle` не шлёт `VERSION_NOT_PROVIDED`, хотя дочитывает версию так же, как `update_sprint`
- **mechanism**: Пакет B добавил `update_sprint` предупреждение `VERSION_NOT_PROVIDED` на случай, когда версия не передана и операция читает её сама («последний выигрывает», чужая параллельная правка перезаписывается без конфликта). `manage_sprint_lifecycle` для `start`/`archive` делает ровно то же самое (`readCurrentVersion`), но предупреждение не выдаёт — только `FIELDS_WITHOUT_VALUE`. Наблюдаемость оптимистичной блокировки у двух инструментов предмета «спринт» разъехалась.
- **trigger**: воспроизводится в нормальной работе — вызвать `manage_sprint_lifecycle` c `action: 'start'`/`'archive'` без `version` (это типичный путь: «вызывающий её обычно не держит»).
- **in_scope**: да
- **anchor**: `packages/servers/yandex-tracker/src/tools/api/sprints/manage-sprint-lifecycle.tool.ts:48-59` (в сопоставлении с `update-sprint.tool.ts`, где `lockWarnings` добавляется)
- **evidence**:
  ```typescript
  return this.formatSuccess(
    { sprintId, action, sprint: filtered, message: ... },
    ResponseFieldFilter.toWarnings(fieldsWithoutValue)   // VERSION_NOT_PROVIDED нет
  );
  ```
- **verification**: confirmed
- **verification_note**: полный код инструмента в рабочем дереве не содержит ветки `VERSION_NOT_PROVIDED`; в `update-sprint.tool.ts` она есть. Операция при этом идентично дочитывает версию.
- **fix_direction**: при `start`/`archive` без переданного `version` добавлять то же предупреждение `VERSION_NOT_PROVIDED`, что и `update_sprint`, чтобы поведение двух инструментов предмета было единообразным.

---

### qwen-03
- **reviewer**: qwen
- **severity**: LOW
- **kind**: pattern
- **domain**: architecture
- **title**: `readCurrentVersion` продублирована почти дословно в трёх операциях
- **mechanism**: Одинаковый приватный метод чтения текущей версии (GET сущности → проверка `typeof version === 'number'` → осмысленный отказ вместо `?version=undefined`) существует в трёх операциях. Две из них (`update-sprint`, `manage-sprint-lifecycle`) читают один и тот же ресурс `/v3/sprints/{id}` и побайтово идентичны. Правка логики (например, обработка ошибки, кеш, текст отказа) потребует синхронизации в трёх местах — источник будущего дрейфа.
- **trigger**: недостижим как дефект сегодня (каждая копия покрыта своим тестом); это накапливаемый технический долг.
- **in_scope**: да
- **anchor**: `src/tracker_api/api_operations/sprint/update-sprint.operation.ts:62`, `src/tracker_api/api_operations/sprint/manage-sprint-lifecycle.operation.ts:71`, `src/tracker_api/api_operations/component/update-component.operation.ts:78`
- **evidence** (2 места из 3, идентичны):
  ```typescript
  private async readCurrentVersion(sprintId: string): Promise<number> {
    const sprint = await this.httpClient.get<SprintOutput>(`/v3/sprints/${sprintId}`);
    const version = sprint.version;
    if (typeof version !== 'number') { throw new Error(...); }
    return version;
  }
  ```
- **verification**: confirmed
- **verification_note**: grep по `readCurrentVersion` подтверждает три реализации; две спринтовые совпадают. Серьёзность намеренно не завышена: копии малы и протестированы.
- **fix_direction**: вынести чтение текущей версии в общий хелпер/сервис (параметризуемый путём ресурса и извлечением `version`), переиспользовать в трёх операциях.

---

### qwen-04
- **reviewer**: qwen
- **severity**: LOW
- **kind**: point
- **domain**: security
- **title**: `personRefs` распаковывает обёртку `{add|remove}` глобально и игнорирует соседние ключи — дыры в нормальной работе нет, но край остаётся
- **mechanism**: Новая ветка `personRefs` срабатывает для ЛЮБОГО записи-значения поля-человека, у которой есть ключ `add` или `remove`, и рекурсирует только в эти два ключа. Соседние ключи такой записи не осматриваются. Теоретическая маска: значение вида `{ add: [...свои...], <нечто>: <ссылка на чужого> }` распознает только `add`. Отвечаю на вопрос брифа: **в нормальной работе дыра не открылась** — (а) реальные формы тела не совмещают `add`/`remove` с верхнеуровневой ссылкой на человека; (б) чужой человек в `users` по-прежнему ловится и этой распаковкой, и глобальным обходом `foreignPersonInBody`; (в) чужая очередь отклоняется ещё раньше — правилом владения `ownershipRule` (журнал), независимо от тела (подтверждено `known-mutating-requests.ts`: чужая очередь → `denied`). `groups`/`roles` людьми не считаются корректно, а подложить логин туда не даёт Zod-схема (числа для групп, белый список ролей).
- **trigger**: недостижим в нормальной работе — только рукотворная/враждебная форма, совмещающая `add`/`remove` с иной ссылкой на человека; ни один инструмент такое тело не строит.
- **in_scope**: да
- **anchor**: `packages/servers/yandex-tracker/src/live_scope/people-in-body.ts:75-84`
- **evidence**:
  ```typescript
  if (isRecord(value) && ('add' in value || 'remove' in value)) {
    const collected: string[] = [];
    for (const key of ['add', 'remove'] as const) {
      if (!(key in value)) continue;
      const nested = personRefs(value[key]);
  ```
- **verification**: confirmed
- **verification_note**: глобальность ветки и пропуск соседних ключей — по коду; отсутствие достижимой дыры — по совокупности `foreignPersonInBody`, `queueAccessViolation` и `ownershipRule`.
- **fix_direction**: зафиксировать семантику соседних ключей: если запись несёт `add`/`remove` и одновременно другие ключи — либо считать их тоже (рекурсия вглубь), либо отказывать как нераспознанную форму (fail-closed), и добавить тест на смешанную запись. Это устранит остаточный край, не меняя поведение на реальных телах.

---

### qwen-05
- **reviewer**: qwen
- **severity**: LOW
- **kind**: pattern
- **domain**: architecture
- **title**: Дрейф белого списка: `archived` остался в `SPRINT_KEYS` и в `UpdateSprintDto`, хотя ни одна схема его не шлёт
- **mechanism**: План снял `version` из `SPRINT_KEYS` прямо по принципу «белый список, разрешающий ключ, которого в теле больше нет, — дрейф, ради которого он заведён». Тот же класс дрейфа остался для `archived`: его не выставляют ни `create_sprint`, ни `update_sprint` (в схемах обоих поля нет), но он присутствует и в белом списке рубежа, и в `UpdateSprintDto`. Правка, которая только что применила этот принцип к `version`/`startDateTime`/`endDateTime`, его же к `archived` не применила. Ослаблением защиты это не является (`archived` — булево, не ссылка на человека/сущность), но это ровно та несогласованность «схема ↔ рубеж», ради устранения которой список заведён.
- **trigger**: недостижим как дефект — ключ никогда не отправляется; это нарушение инварианта белого списка.
- **in_scope**: да
- **anchor**: `src/live_scope/organization-rules.ts:99` и `src/tracker_api/dto/sprint/update-sprint.dto.ts:28`
- **evidence**:
  ```typescript
  const SPRINT_KEYS = ['name', 'board', 'startDate', 'endDate', 'status', 'archived'] as const;
  // update-sprint.dto.ts:
  archived?: boolean | undefined;
  ```
  grep по `src/`: `archived` встречается только в `sprint.entity.ts` (ответ), `update-sprint.dto.ts` и `organization-rules.ts` — ни в одной схеме инструмента.
- **verification**: confirmed
- **verification_note**: отсутствие `archived` в `create-sprint.schema.ts`/`update-sprint.schema.ts` проверено чтением обеих схем; дрейф предсуществующий, но воспроизведён текущей правкой `SPRINT_KEYS`.
- **fix_direction**: применить к `archived` тот же принцип, что к `version`: убрать из `SPRINT_KEYS` и из `UpdateSprintDto` (либо завести в схеме, если поле действительно поддерживается), чтобы белый список совпадал с реально отправляемыми ключами.

---

## Отклонённые (не подтвердившиеся) подозрения
- `чужой человек перестал распознаваться из-за обёртки {add|remove}` — refuted как достижимая дыра; см. qwen-04 (остаточный край недостижим). Ссылки на людей в `users` распознаются, чужая очередь отклоняется правилом владения.
- «тест, зафиксировавший старое поведение и оставшийся зелёным» — не найден: интеграционный тест `manage-queue-access` прежде утверждал `Array.isArray(permissions)===true`; теперь заменён на `===false` и объектную форму; юнит/операционные/live_scope-тесты переписаны под новый контракт.
- «`version` не объявлен в схеме `update_sprint`» — refuted: поле присутствует (`update-sprint.schema.ts`), оптимистичная блокировка рабочая.
- «выход `manage_sprint_lifecycle` ломается на `sprint: null` при `delete`» — refuted: выходная схема `FilteredEntitySchema.nullable()`, инструмент возвращает до фильтрации.

---

## Coverage

**Просмотрено (признано чистым):**
- Все 56 файлов диффа — прочитаны по срезам; акцент на швах: `organization-rules.ts` (A/B/C1), `people-in-body.ts`, `update-sprint.dto.ts` (A/B), `yandex-tracker.facade.ts` (B/C2), `manage-queue-access.schema.ts` (C1 вход / C2 выход), `mock-server.ts`, `known-mutating-requests.ts`.
- Рубеж живых прогонов: правила очереди/доступов/спринтов, глобальный обход людей, `canonicalRequestPath` (срезает query — путь `?version=` сопоставляется), владение очередью по журналу.
- Контракты входа/выхода спринтов и доступов, операции, сервисы, фасада; типобезопасность (`any`/`unknown` не заведены), границы импортов (`#`-префиксы / имена пакетов) — без нарушений.
- Тесты: юнит, операционные, интеграционные, live_scope, сервис/фасада — проверяют эффект (тело/URL/query/GET-вызовы/`not.toHaveBeenCalled`), а не только код ответа.

**Не просмотрено / не до конца:**
- Пакет D глубоко: `scripts/sweep-doc-routes.ts`, `doc-route-sweep.md`, `outgoing-requests.md`, `3_OPEN_ITEMS.md`, правки `README.md` — видел в диффе, но корректность перегенерированных артефактов сверки не верифицировал построчно.
- Полный набор кейсов интеграционного теста `manage-sprint-lifecycle` (видел оснастку и направление; операционный и юнит-тесты этого инструмента проверены полностью).
- `npm run validate:quiet` не запускал (read-only, запуск запрещён заданием) — полагаюсь на заявление брифа о зелёной валидации.
- **Расхождение снимка и рабочего дерева:** `tests/.../sprint/update-sprint.operation.test.ts` присутствует в рабочем дереве (под новую сигнатуру, качественный), но отсутствует в `changes.diff` — снимок может быть чуть устаревшим/неполным. Рецензировал по рабочему дереву, как и просил бриф.

**Итоговая уверенность:** высокая в том, что основные контракты (версия спринта → query с дочитыванием; полный пересмотр `manage_queue_access`; снятие минных параметров) реализованы корректно и покрыты тестами, а рубеж живых прогонов не ослаблен. Найденные находки — одна MEDIUM (комментарий, противоречащий наблюдению) и четыре LOW (наблюдаемость, DRY, остаточный край гейта людей, дрейф белого списка); CRITICAL/HIGH по корректности или безопасности не обнаружено.
