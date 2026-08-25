# Находки ревью: `feat/tracker-v3-migration`, диапазон `fe3bcbe4..HEAD`

reviewer: comprehensive · материал: `review-route-sweep/` (168 файлов, +2013/−7332) · глубина: глубокое
Полная валидация репозитория прогнана лично: `npm run validate:quiet` → `EXIT_CODE=0`, 58/58 задач.

Порядок: HIGH → MEDIUM → LOW. После находок — coverage, затем refuted.

---

### claude-01

- **reviewer**: comprehensive
- **severity**: HIGH
- **kind**: point
- **domain**: reliability
- **title**: `update_queue` сохранил `issueTypes`, который у `create_queue` живой пробой признан гарантированным `400`
- **mechanism**: Пакет починки убрал `issueTypes` из `create_queue` (схема, DTO, tool, метаданные) с обоснованием «живая проба 2026-08-25: `400 issueTypes: Incorrect data format` — любой вызов с ним ронял создание». Тот же ключ остался в `update_queue`: он объявлен в схеме инструмента, лежит в DTO и реально уходит в тело `PATCH /v3/queues/{id}` — это видно в свежесгенерированном `outgoing-requests.md`. Ни один из трёх пакетов не тронул форму ПРАВКИ очереди. При этом маршрут `PATCH /v3/queues/{id}` сам скрипт сверки относит к «маршрутам, которых нет в документации», а для таких вызовов проверка ключей тела вообще не выполняется (см. claude-03) — то есть сверка этот ключ не смотрела ни разу.
- **trigger**: воспроизводится в нормальной работе — любой вызов `update_queue` с `issueTypes`
- **in_scope**: частично — сам якорь схемы вне диффа, но диффом затронуты `create-queue.schema.ts`, `create-queue.dto.ts` и общий белый список `QUEUE_KEYS`, то есть решение «что очередь принимает в теле» пересматривалось именно здесь
- **anchor**: `packages/servers/yandex-tracker/src/tools/api/queues/update-queue.schema.ts:46`, `packages/servers/yandex-tracker/src/tracker_api/dto/queue/update-queue.dto.ts:23`, `packages/servers/yandex-tracker/outgoing-requests.md` (строка `update_queue`)
- **evidence**:
  ```
  update-queue.schema.ts:46   issueTypes: z.array(z.string()).optional(),
  outgoing-requests.md        | update_queue | нет | нет | PATCH | /v3/queues/probe_queueId
                              | name, lead, defaultType, defaultPriority, description, issueTypes |
  create-queue.schema.ts:10   Параметра `issueTypes` здесь нет намеренно: живая проба 2026-08-25
                              показала `400 issueTypes: Incorrect data format`
  ```
- **verification**: confirmed
- **verification_note**: три независимых источника в рабочем дереве — схема, DTO и машинно снятое перечисление исходящих запросов. Что API на правке ведёт себя так же, как на создании, — гипотеза, а не факт; но именно её никто не проверял, и это ответ на вопрос брифа «какую форму входа не покрыл ни один пакет»: форма ТЕЛА ПРАВКИ очереди.
- **fix_direction**: либо живой пробой закрыть вопрос, принимает ли `PATCH /v3/queues/{id}` ключ `issueTypes` (проба требует снятия блокировки из claude-02), либо снять параметр симметрично `create_queue` и перенаправить на `issueTypesConfig`. Промежуточное состояние «у создания убрали, у правки оставили без объяснения» хуже любого из двух исходов.

---

### claude-02

- **reviewer**: comprehensive
- **severity**: HIGH
- **kind**: point
- **domain**: tests
- **title**: `QUEUE_KEYS` рубежа обслуживает и создание, и правку — снятие `issueTypes` закрывает живую пробу `update_queue`
- **mechanism**: `QUEUE_KEYS` — единственный белый список, который используется дважды: в `QUEUE_CREATE_RULE` (`POST /v3/queues`) и в `ownershipRule(/^\/v3\/queues\/([^/?]+)\/?$/)` для правки. Диффом из него удалён `issueTypes` — по мотивам создания. Следствие для правки: `update_queue`, передавший `issueTypes`, теперь получает отказ рубежа «очередь: неизвестный ключ» ДО сети. Это fail-closed, то есть данные не портятся, но именно живая проба, которой только и можно закрыть claude-01, становится невыполнимой под рубежом. Таблица `KNOWN_MUTATING_REQUESTS` этот случай не ловит: строка `update_queue` идёт вовсе без тела и ожидает `denied` по другой причине (очередь `TEST` не в журнале), поэтому расхождение белого списка со схемой инструмента не проверяется ни одним тестом.
- **trigger**: воспроизводится в нормальной работе — при живом прогоне `update_queue` с `issueTypes`
- **in_scope**: да
- **anchor**: `packages/servers/yandex-tracker/src/live_scope/organization-rules.ts:46-54` (`QUEUE_KEYS`) и `:283-289` (правило правки очереди); `packages/servers/yandex-tracker/tests/live_scope/known-mutating-requests.ts:214-221`
- **evidence**:
  ```
  organization-rules.ts   const QUEUE_KEYS = ['key','name','lead','defaultType',
                            'defaultPriority','description','issueTypesConfig'] as const;
                          // (в диффе из списка удалён 'issueTypes')
  known-mutating-requests.ts:214   { tool: 'update_queue', method: 'patch',
                                     path: `/v3/queues/${SANDBOX_QUEUE}`,
                                     expectation: 'denied' }   // тела нет вовсе
  ```
- **verification**: confirmed
- **verification_note**: комментарий над списком утверждает, что состав «снят по DTO и операциям… а не по памяти ревьюера». Для `update-queue.dto.ts` это не выполнено — там `issueTypes` есть. Значит, инвариант, которым обоснован сам список, нарушен именно этой правкой.
- **fix_direction**: развести перечни создания и правки очереди так же, как это уже сделано для доски и глобального поля (`createAllowedKeys` рядом с `allowedKeys`), и добавить в `KNOWN_MUTATING_REQUESTS` строку правки очереди С ТЕЛОМ, чтобы расхождение белого списка со схемой инструмента ловилось машинно.

---

### claude-03

- **reviewer**: comprehensive
- **severity**: HIGH
- **kind**: point
- **domain**: tests
- **title**: Сверка ключей тела не выполняется для маршрутов без страницы и сводится к поиску по всей странице для остальных
- **mechanism**: `judge()` устроен так, что проверка ключей тела выключается ровно там, где риск наибольший: если у вызова не нашлось ни одной страницы справочника (`hitPages.length === 0`), `unknownBodyKeys` и `settledBodyKeys` принудительно пустые — маршрут попадает только в раздел «нет в документации», а его тело не смотрится вовсе. Для вызовов со страницей ключ ищется регуляркой по `page.text` — это ВЕСЬ текст статьи, включая таблицы полей ОТВЕТА, примеры, соседние разделы. Ключ, упомянутый на странице в любой роли, засчитывается как «документирован в теле запроса». Оба свойства делают отчёт слепым к классу D9 — тому самому, ради которого скрипт написан. Отчёт `doc-route-sweep.md` показывает «Ключи тела, не упомянутые на странице своего маршрута (0)»; для `update_queue` (claude-01) этот ноль получен первым механизмом, а не проверкой.
- **trigger**: воспроизводится в нормальной работе — уже произошло на первом же прогоне
- **in_scope**: да
- **anchor**: `packages/servers/yandex-tracker/scripts/sweep-doc-routes.ts:281-307`
- **evidence**:
  ```ts
  const absent = call.bodyKeys.filter(
    (key) => !SAMPLE_ARTEFACT_KEYS.has(key) &&
      !new RegExp(`(?<![\\w-])${key}(?![\\w-])`).test(blob));
  const empty: string[] = [];
  return { call, pages: hitPages,
    unknownBodyKeys: hitPages.length > 0 ? absent.filter(...) : empty,
    settledBodyKeys:  hitPages.length > 0 ? absent.filter(...) : empty };
  ```
- **verification**: confirmed
- **verification_note**: прочитан код `judge()` и сверен с `doc-route-sweep.md`: три маршрута в разделе «нет в документации» (`PATCH /v3/queues/{id}`, `GET /v3/queues/{id}/components`, `GET /v3/myself/favorites/filters`) и ноль в разделе ключей тела — при том, что у первого из них тело есть и содержит спорный ключ.
- **fix_direction**: ключи тела маршрута без страницы должны попадать в отчёт как «не проверено», а не растворяться; для маршрутов со страницей — сузить область поиска до блока описания параметров ТЕЛА ЗАПРОСА, а не всей статьи, и явно печатать в шапке, сколько вызовов осталось непроверенными. Пока это не сделано, «0 расхождений» в отчёте нельзя цитировать как доказательство.

---

### claude-04

- **reviewer**: comprehensive
- **severity**: MEDIUM
- **kind**: point
- **domain**: security
- **title**: Новая форма фильтра доски вносит ссылку на очередь в поле, которое рубеж не проверяет
- **mechanism**: До правки `filter` доски был `{ query?: string }` — ссылки на очередь в нём не было. Диффом форма изменена на свободную карту «поле задачи → значения», и типовое её содержимое, прямо процитированное в комментарии, — `{"queue": ["DVIZHDEV"]}`. Рубеж живого прогона на правке доски (`boardEditViolation`) смотрит только на `body['queue']` верхнего уровня; `allowedKeysViolation` проверяет лишь имена ключей верхнего уровня и `filter` в `BOARD_KEYS` присутствует. Вложенный `filter.queue` не проверяется ничем. То есть `PATCH /v3/boards/{своя доска}` с `filter: {queue: ["PROD"]}` рубеж пропустит, и доска прогона начнёт показывать задачи чужой очереди. Симметричная проверка для СОЗДАНИЯ доски написана (`boardCreateViolation` разбирает `autoFilters`) — на правке аналога нет.
- **trigger**: воспроизводится в нормальной работе — обычный вызов `update_board` с фильтром по очереди во время живого прогона
- **in_scope**: да
- **anchor**: `packages/servers/yandex-tracker/src/live_scope/organization-rules.ts:150-155` (`boardEditViolation`), `packages/servers/yandex-tracker/src/tools/api/boards/update-board.schema.ts:18-27`
- **evidence**:
  ```ts
  const boardEditViolation: BodyViolation = (body, context) => {
    const queue = body?.['queue'];
    return queue !== undefined && !queueRefWithinScope(queue, context)
      ? 'доска привязана к очереди за пределами прогона (queue)' : undefined;
  };
  // update-board.schema.ts: «Форма снята чтением боевых досок 2026-08-25:
  //   {"queue": ["DVIZHDEV"], "resolution": ["empty()"], "type": ["task"]}»
  ```
- **verification**: confirmed
- **verification_note**: порчи чужих данных не происходит — доска принадлежит прогону, а чужая очередь только читается. Поэтому не HIGH. Но заявленный инвариант рубежа «сущность прогона не выводится за его пределы ссылкой в теле» этой правкой перестал держаться на доске, и молча: ни один тест не подаёт `filter` с очередью.
- **fix_direction**: распространить проверку принадлежности очереди на вложенный `filter` правки доски по образцу `boardCreateViolation` для `autoFilters`; рассмотреть тот же вопрос для свободного `query`, который тоже умеет адресовать чужую очередь. Добавить кейс в `body-inspection.test.ts`.

---

### claude-05

- **reviewer**: comprehensive
- **severity**: MEDIUM
- **kind**: point
- **domain**: reliability
- **title**: `readCurrentVersion` не защищён от ответа без `version` — в URL уезжает `?version=undefined`
- **mechanism**: `Component.version` объявлен обязательным `readonly version: number`, но это только тип: `readCurrentVersion` берёт `component.version` из распарсенного JSON без всякой проверки и подставляет в шаблон строки. Ответ, в котором поля нет (старая версия API, урезанный ответ, ошибка формы), даёт буквальную строку `/v3/components/1?version=undefined`, которая уходит в сеть и возвращает ответ API об ошибке формата — то есть настоящая причина («поле version в ответе отсутствует») подменяется чужой диагностикой на стороне Трекера. Ровно этот сценарий бриф выделяет отдельным пунктом; ни теста, ни рантайм-проверки нет — все три теста операции подают фикстуру с `version`.
- **trigger**: воспроизводится в нормальной работе, если API перестанет отдавать `version` на `GET /v3/components/{id}`; на рукотворном входе — гарантированно
- **in_scope**: да
- **anchor**: `packages/servers/yandex-tracker/src/tracker_api/api_operations/component/update-component.operation.ts:74-81`
- **evidence**:
  ```ts
  private async readCurrentVersion(componentId: string): Promise<number> {
    const component = await this.httpClient.get<ComponentOutput>(`/v3/components/${componentId}`);
    return component.version;
  }
  // и далее: `/v3/components/${componentId}?version=${effectiveVersion}`
  ```
- **verification**: confirmed
- **verification_note**: `tests/tracker_api/api_operations/component/update-component.operation.test.ts` — во всех кейсах `createComponentFixture({ version: N })`; ветки «в ответе нет version» нет. Форма ответа `PATCH` организационных сущностей, по признанию самого `CLAUDE.md` пакета, вживую наблюдалась не полностью.
- **fix_direction**: проверять тип прочитанного значения перед подстановкой и падать со своей внятной причиной, называющей отсутствующее поле; закрыть кейс тестом операции.

---

### claude-06

- **reviewer**: comprehensive
- **severity**: MEDIUM
- **kind**: point
- **domain**: reliability
- **title**: Чтение версии молча превращает оптимистичную блокировку в «последний выигрывает», и вызывающий об этом не узнаёт
- **mechanism**: `execute(componentId, data, version?)` при отсутствии `version` читает текущую сама. Между `GET` и `PATCH` — окно, в котором чужая правка проходит и затем затирается нашей: API-механизм защиты формально соблюдён (версия свежая), а смысл его потерян. Предупреждение об этом живёт только в `.describe()` схемы инструмента, то есть адресовано модели, которая параметр как раз и не передала. Ни в ответе инструмента, ни в логах нет признака «версия была прочитана автоматически» — постфактум отличить безопасную правку от гонки невозможно.
- **trigger**: воспроизводится в нормальной работе при параллельной правке одного компонента
- **in_scope**: да
- **anchor**: `packages/servers/yandex-tracker/src/tracker_api/api_operations/component/update-component.operation.ts:48-56`
- **evidence**:
  ```ts
  const effectiveVersion = version ?? (await this.readCurrentVersion(componentId));
  const updatedComponent = await this.httpClient.patch<ComponentOutput>(
    `/v3/components/${componentId}?version=${effectiveVersion}`, componentData);
  ```
- **verification**: confirmed
- **verification_note**: компромисс осознан и задокументирован комментарием в операции — это не недосмотр. Находка не о самом решении, а о его ненаблюдаемости: `this.logger.info` рядом пишет только «Обновление компонента N».
- **fix_direction**: отметить факт автоматического чтения версии в логе и в предупреждениях ответа инструмента (`warnings` уже есть в контракте), чтобы «последний выигрывает» был видимым режимом, а не невидимым по умолчанию.

---

### claude-07

- **reviewer**: comprehensive
- **severity**: MEDIUM
- **kind**: point
- **domain**: tests
- **title**: `mockUpdateComponent404` описывает невозможную последовательность и не проверяет, что версия читается
- **mechanism**: В обновлённом моке `GET /v3/components/{id}` отвечает `200` с валидным компонентом, а следующий за ним `PATCH` — `404`. Живьём такая пара невозможна: если компонента нет, `404` придёт уже на чтении версии, и до `PATCH` дело не дойдёт. Тест «обработка 404 при обновлении» тем самым проверяет ветку, которой в бою не бывает, и не проверяет ту, которая бывает. Кроме того, добавленный `GET` не заносится в `pendingMocks` — оснастка, которая для всех прочих запросов роняет тест на незаявленном или несостоявшемся вызове, здесь эту гарантию не даёт: если операция перестанет читать версию, тест останется зелёным.
- **trigger**: воспроизводится в нормальной работе оснастки — на каждом прогоне тестов
- **in_scope**: да
- **anchor**: `packages/servers/yandex-tracker/tests/integration/helpers/mock-server.ts:1363-1400`
- **evidence**:
  ```ts
  mockUpdateComponent404(componentId: string): this {
    const response = generateError404();
    this.mockAdapter.onGet(`/v3/components/${componentId}`)
      .reply(200, generateComponent({ overrides: { id: componentId } }));
    const mockKey = `PATCH /v3/components/${componentId}`;   // GET в pendingMocks не попадает
  ```
- **verification**: confirmed
- **verification_note**: сверено с `update-component.operation.ts`: `readCurrentVersion` вызывается до `patch`, значит `404` компонента наступает на первом запросе.
- **fix_direction**: перевести `mockUpdateComponent404` на отказ уже на чтении версии, а сценарий «версия прочитана, PATCH отверг» держать отдельным кейсом с честной причиной (например, конфликт версий); добавить `GET` в учёт ожидаемых запросов, чтобы пропажа чтения версии роняла тест.

---

### claude-08

- **reviewer**: comprehensive
- **severity**: MEDIUM
- **kind**: contract
- **domain**: architecture
- **title**: Сохранённая конфигурация пользователя — форма входа, которую манифест не перекрывает: `projects` продолжит гасить Entity API
- **mechanism**: Категория `ToolCategory.PROJECTS` после удаления легаси означает девять инструментов Entity API, и `projects` убран из `default` параметра `disabled_tool_groups` в `manifest.template.json`. Но `default` манифеста действует только на НОВУЮ установку: у пользователя, поставившего MCPB раньше, значение уже сохранено строкой, содержащей `projects`, и обновление сервера его не меняет. Кода со своим значением по умолчанию нет — `parseDisabledToolGroups` при пустом входе не отключает ничего, а `projects` остаётся вполне валидным именем категории, поэтому предупреждения о неизвестной группе тоже не будет. Результат: молчаливое исчезновение всей работы с проектами, портфелями и целями у ровно тех пользователей, ради которых правка и делалась. Ни один из трёх пакетов эту форму входа не рассматривал.
- **trigger**: воспроизводится в нормальной работе — у любого пользователя, обновившего уже установленный MCPB
- **in_scope**: да
- **anchor**: контракт `DISABLED_TOOL_GROUPS` — `packages/servers/yandex-tracker/manifest.template.json:82`, `packages/servers/yandex-tracker/src/config/config-loader.ts:128`, `packages/servers/yandex-tracker/CLAUDE.md` §5.0
- **evidence**:
  ```
  manifest.template.json  -"default": "...,issues:bulk,projects,components,checklists,helpers:demo"
                          +"default": "...,issues:bulk,components,checklists,helpers:demo"
  config-loader.ts:128    function parseDisabledToolGroups(value: string | undefined)
                          // пустая строка/undefined → ничего не отключаем; своего дефолта нет
  CLAUDE.md §5.0          «пока она там стояла, профиль MCPB по умолчанию прятал единственный
                            способ работать с проектами, портфелями и целями разом»
  ```
- **verification**: confirmed
- **verification_note**: проверено грепом — второго места с дефолтным значением в коде нет, значит перенос смысла категории (`projects`: легаси → Entity API) не сопровождается ничем, что предупредило бы уже настроенного пользователя. Механику доставки обновлений MCPB лично не проверял, поэтому вывод «значение не перезаписывается» держится на том, что это пользовательская настройка.
- **fix_direction**: при старте предупреждать в stderr, если `DISABLED_TOOL_GROUPS` содержит `projects`, с пояснением, что смысл группы изменился 2026-08-25; отразить смену смысла в разделе миграции README, а не только в CLAUDE.md для агентов.

---

### claude-09

- **reviewer**: comprehensive
- **severity**: MEDIUM
- **kind**: point
- **domain**: tests
- **title**: Сверка маршрутов не имеет ненулевого кода выхода и не входит в `validate` — артефакт протухнет молча
- **mechanism**: `main()` печатает сводку и завершается нулём независимо от того, сколько расхождений найдено; шага `sweep:doc-routes` нет в `scripts/validate.sh`. `doc-route-sweep.md` при этом закоммичен как обычный файл. Это ровно та конструкция, которая порождает «документ, читающийся как проверка»: отчёт от 2026-08-25 останется в репозитории и через полгода, а разошедшийся с ним код никого не уронит. Дополнительно `LIVE_VERIFIED_KEYS` ключуется именем инструмента, а не парой «метод + путь»: инструмент, у которого появится второй маршрут, унаследует погашение расхождений с первого.
- **trigger**: воспроизводится в нормальной работе — при первом же изменении маршрута без ручного перезапуска сверки
- **in_scope**: да
- **anchor**: `packages/servers/yandex-tracker/scripts/sweep-doc-routes.ts:389-421`, `packages/servers/yandex-tracker/scripts/sweep-doc-routes.ts:100-104`
- **evidence**:
  ```ts
  process.stdout.write(`Разобрано страниц: ${pages.length}\n` + ...);
  }
  void main();          // ни process.exitCode, ни throw при drift
  const LIVE_VERIFIED_KEYS = new Map<string, Set<string>>([
    ['fr_yandex_tracker_update_board', new Set(['filter','orderBy','orderAsc','query'])], ...
  ```
- **verification**: confirmed
- **verification_note**: сверено с `package.json` (скрипт есть) и с корневым `scripts/validate.sh` (шага нет). Ставить сетевой запрос к 156 страницам в `validate` неразумно — находка не о том, чтобы включить его в CI как есть, а о том, что сейчас нет никакого механизма протухания.
- **fix_direction**: возвращать ненулевой код при непустых разделах расхождений, чтобы сверку можно было ставить в отдельный периодический прогон; печатать в отчёт дату кэша страниц; ключевать `LIVE_VERIFIED_KEYS` парой «метод + путь», а не именем инструмента.

---

### claude-10

- **reviewer**: comprehensive
- **severity**: LOW
- **kind**: point
- **domain**: tests
- **title**: Инвентарь аннотаций dev-client не догнали два пакета удаления
- **mechanism**: Пакет легаси-проектов обновил `tools-annotations-inventory.md` (счётчик read-only 40 → 38, пять строк таблицы удалены), а пакеты `delete_component` и `delete_global_field` — нет. В таблице остались две строки, ссылающиеся на файлы метаданных, которых в дереве больше нет. Классический шов: один и тот же документ трогали три пакета, а привёл его в порядок один.
- **trigger**: воспроизводится в нормальной работе — при следующем чтении документа
- **in_scope**: да
- **anchor**: `packages/framework/dev-client/docs/tools-annotations-inventory.md:140`, `:153`
- **evidence**:
  ```
  | yandex-tracker | delete_component     | false | true | true | true | delete-component.metadata.ts |
  | yandex-tracker | delete_global_field  | false | true | true | true | delete-global-field.metadata.ts |
  ```
- **verification**: confirmed
- **verification_note**: оба файла метаданных удалены диффом (`delete-component.metadata.ts`, `delete-global-field.metadata.ts` в `diff_files.txt` со знаком −).
- **fix_direction**: убрать обе строки и пересчитать заявленные в шапке числа инструментов; заодно решить, не пора ли генерировать эту таблицу тем же перечислителем, что и `outgoing-requests.md`, — руками её уже трижды забывали.

---

### claude-11

- **reviewer**: comprehensive
- **severity**: LOW
- **kind**: point
- **domain**: style
- **title**: Сводная таблица README разошлась с собственным детальным списком
- **mechanism**: Детальный раздел компонентов исправлен на «Components (3 инструмента)», а строка сводной таблицы выше осталась `| **Components** | 4 |`. Заголовок раздела «Поддерживаемые API (42 инструмента)» был устаревшим и до этой правки (инструментов 85), но строка компонентов стала неверной именно сейчас.
- **trigger**: воспроизводится в нормальной работе — при чтении README
- **in_scope**: да
- **anchor**: `packages/servers/yandex-tracker/README.md:176-188`
- **evidence**:
  ```
  ### Поддерживаемые API (42 инструмента)
  | **Components** | 4 | Управление компонентами проекта |
  ...
  <summary><strong>Components (3 инструмента)</strong></summary>
  ```
- **verification**: confirmed
- **verification_note**: обе строки прочитаны в рабочем дереве; CLAUDE.md пакета в том же диффе на 85 обновлён корректно.
- **fix_direction**: привести строку компонентов к 3 и заодно к реальному числу заголовок раздела; числа в README, которые уже трижды разошлись, стоит либо проверять тем же храповиком, что и `TOOL_CLASSES`, либо не писать.

---

### claude-12

- **reviewer**: comprehensive
- **severity**: LOW
- **kind**: pattern
- **domain**: tests
- **title**: Моки фасада продолжают объявлять удалённый метод `getProjects`
- **mechanism**: Метод `getProjects` снят с `YandexTrackerFacade`, но два теста фасада продолжают класть его в мок-объект. Тайпчек это не ловит: объект приводится к типу фасада, лишнее поле в приведении не мешает. Мёртвая заглушка вводит в заблуждение следующего читателя ровно там, где ему надо понять, чем фасад пользуется.
- **trigger**: недостижим — на поведение не влияет
- **in_scope**: да
- **anchor**: `packages/servers/yandex-tracker/tests/tracker_api/facade/yandex-tracker.facade.test.ts:134`, `packages/servers/yandex-tracker/tests/tracker_api/facade/yandex-tracker.facade.batch.test.ts:135`
- **evidence**:
  ```ts
  getProjects: vi.fn(),
  ```
- **verification**: confirmed
- **verification_note**: грепом по `src/` метод `getProjects` не встречается ни разу; оба файла в диффе изменялись (−14 и −2 строки), то есть их правили и эти строки пропустили.
- **fix_direction**: убрать обе заглушки; прочие удалённые символы (`ProjectService`, `ProjectOutput`, `DeleteComponentOperation` и т.д.) вычищены полностью — проверено грепом, остаток только здесь.

---

### claude-13

- **reviewer**: comprehensive
- **severity**: LOW
- **kind**: pattern
- **domain**: reliability
- **title**: Хрупкости разбора в скрипте сверки: неэкранированный ключ в регулярке, вечный кэш, двухуровневое оглавление
- **mechanism**: Три независимых мелочи одного класса. (1) Ключ тела подставляется в `new RegExp` без экранирования — ключ со спецсимволом даст либо исключение, либо ложное совпадение. (2) Кэш страниц в `tmpdir()` не имеет срока годности: без `--refresh` сверка сколь угодно старая пройдёт как свежая, и в отчёте это никак не отражается. (3) Оглавление собирается регуляркой ровно на два сегмента `api-ref/x/y` — страница глубже уровнем не попадёт в обход и её маршруты просто не будут существовать для сверки, дав ложное «маршрута нет в документации».
- **trigger**: воспроизводится в нормальной работе — (2) при повторном прогоне, (3) при любом углублении структуры справочника
- **in_scope**: да
- **anchor**: `packages/servers/yandex-tracker/scripts/sweep-doc-routes.ts:296`, `:129-135`, `:391-393`
- **evidence**:
  ```ts
  !new RegExp(`(?<![\\w-])${key}(?![\\w-])`).test(blob)
  if (!refresh && existsSync(file) && statSync(file).size >= MIN_PAGE_BYTES) return readFileSync(file,'utf8');
  [...seed.matchAll(/api-ref\/[a-z0-9-]+\/[a-z0-9-]+/g)]
  ```
- **verification**: confirmed
- **verification_note**: (1) сегодня безобиден — все ключи тела в `outgoing-requests.md` идентификаторы; поэтому LOW, а не выше. (3) сейчас даёт 152 разобранные страницы против 156 заявленных в брифе — расхождение возможно и от битых ссылок, которые скрипт честно печатает; какая из причин сработала, лично не разделял.
- **fix_direction**: экранировать ключ перед сборкой регулярки; печатать в отчёт возраст кэша каждой страницы (или инвалидировать по времени); ослабить регулярку оглавления по глубине и печатать число страниц, отброшенных как несовпавшие.

---

### claude-14

- **reviewer**: comprehensive
- **severity**: LOW
- **kind**: point
- **domain**: architecture
- **title**: Ограничение «orderBy без filter» невыразимо в inputSchema и покрыто тестом наполовину
- **mechanism**: Правило вынесено в `.refine` поверх объекта. Плюсы очевидны и текст отказа хороший, но два следствия остались неназванными. Во-первых, `generateDefinitionFromSchema` отдаёт клиенту JSON Schema, в которой межполевого условия нет вовсе — модель узнаёт о нём только получив отказ, то есть ценой лишнего хода. Во-вторых, `path: ['orderBy']` привязывает ошибку к полю, которого в вызове может не быть: передавшему только `orderAsc` укажут на `orderBy`. Тест покрывает лишь ветку `orderBy` — случай одного `orderAsc` не проверен.
- **trigger**: воспроизводится в нормальной работе — при вызове `update_board` с одним `orderAsc`
- **in_scope**: да
- **anchor**: `packages/servers/yandex-tracker/src/tools/api/boards/update-board.schema.ts:73-88`, `packages/servers/yandex-tracker/tests/tools/api/boards/update-board.tool.test.ts:89-93`
- **evidence**:
  ```ts
  .refine((params) => params.orderBy === undefined && params.orderAsc === undefined
      ? true : params.filter !== undefined,
    { message: 'orderBy и orderAsc ...', path: ['orderBy'] });
  ```
- **verification**: confirmed
- **verification_note**: `npm run validate:quiet` зелёный, включая храповик «144 схем чисты» — то есть `ZodEffects` генератору определения не мешает; вопрос только в выразительности результата и в полноте теста.
- **fix_direction**: продублировать смысл ограничения в `.describe()` полей `orderBy`/`orderAsc`, чтобы оно доехало до модели через inputSchema; добавить тест на одиночный `orderAsc` и подумать, не привязывать ли путь ошибки к `filter` — отсутствует именно он.

---

## Coverage

### Покрыто и признано чистым (без находок)

- **Снятие правила `/v3/projects` из рубежа живого прогона — рассуждение проверено и держится.** `RAW_API_METHODS = ['GET']` (`packages/framework/core/src/tools/raw/raw-api.types.ts:16`), схема raw-инструмента строится `z.enum(RAW_API_METHODS)`, операция несёт `switch` с `default: throw`. Ни один другой инструмент к `/v3/projects` не обращается (грепом по `src/`). Рубеж fail-closed: `decideRequest` при отсутствии совпавшего правила возвращает отказ, а не допуск. Снятие правила поэтому строго сужает разрешённое, дыры не открывает. Чтение `/v3/projects` через `raw_api_request` остаётся возможным и проходит по `SAFE_METHODS` — это не мутация и не регресс.
- **Полнота удаления трёх семейств на уровне кода.** Грепом по всему монорепо проверено отсутствие висячих ссылок на `ProjectService`, `ProjectOutput`, `ProjectWithUnknownFields`, `GetProjectsDto`, `CreateProjectDto`, `UpdateProjectDto`, `GetProjectsOperation`, `DeleteFieldOperation`, `DeleteComponentOperation`, `DeleteComponentTool`, `DeleteGlobalFieldTool`, `ProjectResourceProvider`, `projectSummaryPrompt`, `PROJECT_URI_TEMPLATE`, `buildProjectResourceUri`/`parseProjectResourceUri`, `createMinimalProject`/`createFullProject`, `pinProjectsLink`, фикстур `project.fixture`/`project-dto.fixture`. Ноль вхождений у всех, кроме одного случая в тестах (claude-12). Регистрации в DI (`tool-definitions`, `operation-definitions`, `facade-services`), контейнеры сервисов, реестр ресурсов, провайдер промптов, `EntityKind`, `LIVE_EXEMPT_CATEGORY_FOLDERS`, `LEGACY_MOCK_TEST_PATHS` со счётчиком-храповиком — согласованы между собой.
- **`canonicalRequestPath` и новый `?version=` в пути правки компонента.** Строка запроса отсекается до сопоставления (`url.indexOf('?')`), поэтому `PATCH /v3/components/{id}?version=N` по-прежнему попадает в своё правило; правила при этом остаются заякоренными, а запрет процентного кодирования и `..`/`.`/`//` не задет.
- **Регистрация созданного в журнале.** `createdEntityOf` и `IDENTIFIER_FIELDS` после удаления рода `project` внутренне непротиворечивы; `board` по-прежнему ловится на маршруте создания `liveBoards`, `entity` — по составному `{type}/{id}`.
- **Переписанные тесты рубежа (12 файлов).** Прочитаны все диффы. Механики сохранены: fail-closed (`live-scope.guard.test.ts` — v2-путь, неизвестное правило), белый список ключей (`body-inspection.test.ts` — перенесён на доску/спринт/поле/фильтр), непереименование своей сущности, ссылки на людей в теле (перенесены на очередь), незаданный `runPrefix` и незаданный `runOwner` (перенесены на фильтр и очередь), доказательство владения одноразовой очередью журналом, а не переменной (перенесено на доску). Дополнительно ДОБАВЛЕНЫ два кейса, которых не было: отказ на неизвестном вложенном ресурсе задачи и допуск законной глубины `/transitions/{id}/_execute`. Выхолащивания не нашёл; единственное честно потерянное свойство — условие 12 (дуальная адресация id/key на уровне ПРАВИЛА, а не журнала) заменено ссылкой на тесты регистрации, что покрывает его лишь частично, но эквивалентно по существу — я счёл это допустимым и находкой не оформлял.
- **Полная валидация репозитория.** `npm run validate:quiet` прогнан лично: `EXIT_CODE=0`, 58/58 задач (build, typecheck ×3, test:coverage, smoke ×3, raw-wire, depcruise, validate:docs, validate:tools, lint, cpd), храповик схем 144 чист, prettier чист. То есть ни удаления, ни правки не оставили сломанной сборки, типов, графа зависимостей, лимитов документации или бюджета предупреждений.
- **Удаление промпта `project-summary` и ресурса `tracker://project/{id}`.** Потеря осознана и обоснована письменно (`3_OPEN_ITEMS.md` §5, `tracker-prompt-provider.ts`): перенос на Entity API требует знать реальный состав полей, а он живьём не снят. Согласен с решением — перенос на непроверенных полях воспроизвёл бы способ, которым заведена вся разбираемая серия. Тесты обоих уровней (unit и wire) приведены к 3 промптам и 2 ресурсам согласованно, счётчики в `resources/list` и `templates/list` поправлены.
- **`create_queue` без `issueTypes`, `update_board` без `version`, новая форма фильтра доски** — на стороне самих этих инструментов правки самосогласованы: схема, DTO, tool, метаданные, тесты и белые списки рубежа приведены в соответствие друг другу. Претензии касаются соседних маршрутов (claude-01) и вложенного содержимого фильтра (claude-04), а не самих правок.

### НЕ покрыто

- **Ответы боевого API не проверял** — VPN, токен и живой прогон мне недоступны. Все утверждения о поведении Трекера (`428` без версии, `400` на `issueTypes`, `422` на `filter: {query}`, тождество легаси и Entity API по составу проектов) приняты по отчётам живых проб в `.agentic-planning/**` без независимой перепроверки. Это же относится к вопросу, отвергает ли `PATCH /v3/queues/{id}` ключ `issueTypes` (claude-01) — там у меня гипотеза, а не факт.
- **Скрипт `sweep-doc-routes.ts` не запускал** — это 156 сетевых запросов к справочнику Яндекса. Разбор HTML регулярками оценивал только чтением кода; на реальной странице справочника ни один из паттернов (`request_example method_\w+`, `hljs`, «В этой статье», «Справочник API») не проверял. Соответственно не проверял и достоверность самого `doc-route-sweep.md` — сколько из трёх «маршрутов без страницы» настоящие, а сколько промахи разбора.
- **`outgoing-requests.md` не перегенерировал** (`npm run enumerate:requests`) — таблица принята как есть; строка `update_queue` с `issueTypes`, на которой стоит claude-01, взята из закоммиченного файла.
- **`npm run tools:batch` / `tools:call` не запускал** — это вызовы в боевой Трекер под реальным токеном.
- **Инвентарные документы плана** (`inventory/legacy-vs-entity-projects-LIVE.md`, `projects-vs-entities.md`, `delete-tools-refs.md`, отчёты прогонов) читал выборочно, ради контекста решений; их внутреннюю достоверность и полноту не аудировал.
- **Пакет `yandex-wiki`, framework-пакеты кроме `raw-api.types.ts` и `dev-client/docs`** — диффом почти не затронуты, отдельно не смотрел.
- **Производительность и потребление контекста** оценивал только точечно (лишний GET на правку компонента, включение девяти инструментов Entity API в состав по умолчанию); замеров размера `tools/list` до и после не делал.
- **Механику доставки обновлений MCPB** (перезаписывается ли сохранённое значение `disabled_tool_groups` при обновлении расширения) лично не проверял — claude-08 держится на том, что это пользовательская настройка, а не на чтении кода установщика.

## Отклонённые (refuted)

Находок со статусом `refuted` нет. Две гипотезы, проверенные и НЕ подтвердившиеся, названы явно в разделе coverage и в оформленные находки не превращены: (1) «снятие правила `/v3/projects` открыло дыру в рубеже» — опровергнуто fail-closed политикой и GET-only raw-инструментом; (2) «после удаления легаси остались висячие ссылки на удалённые символы» — опровергнуто грепом по всем восемнадцати именам, кроме единственного случая в claude-12.
