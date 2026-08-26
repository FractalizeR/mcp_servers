/**
 * Потульный реестр живых наблюдений: что именно наблюдалось живьём и где живой
 * прогон недостижим. Единственный источник СПИСКА для клеток С-4/С-5 в
 * `scripts/build-coverage-matrix.ts`; `tests/TESTING_STRATEGY.md` §1 остаётся
 * источником ПРИЧИНЫ (какая песочница, какой допуск по владению прогоном).
 *
 * Заменил прежний категорийный список — набор шести папок `src/tools/api/*`, который
 * объявлял «живьём не наблюдается никогда» сразу 36 инструментам. Посылка устарела
 * молча: допуск по владению прогоном (этап 5.1) открыл доски, спринты, фильтры и
 * очереди, прогоны 25 и 26 августа их наблюдали, а записать факт наблюдения было
 * некуда — тип клетки `живьём` существовал, но `computeRow` его не производил никогда.
 *
 * Обе записи потульные и обе несут ссылку на отчёт прогона. Отчёты живут в
 * `tests/live-runs/`, а не в каталоге плана: `.agentic-planning/**` предписано удалять
 * после исполнения плана, и его нет в `inputs` задачи `coverage:check` — уборка дала бы
 * кэш-хит и зелёный гейт при исчезнувшем доказательстве.
 *
 * Оговорка о раскладке: каталог называется `coverage-exceptions`, а `LiveObservation`
 * исключением не является — как не является им и храповик `legacy-mock-tests.ts`.
 * Фактический предмет каталога — машинно читаемые оговорки к клеткам матрицы;
 * переименование каталога стоит дороже выигрыша (чужие импорты, история git) и здесь
 * не делается сознательно.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MCP_TOOL_PREFIX } from '#constants';
import { GATED_PROPERTIES, isGatedProperty } from './coverage-gate-baseline.js';
import { LIVE_OBSERVABLE_PROPERTIES } from './types.js';
import type {
  LiveObservableProperty,
  LiveObservation,
  LiveUnreachable,
  RetiredLiveObservation,
} from './types.js';

const VALID_LIVE_PROPERTIES: ReadonlySet<string> = new Set(LIVE_OBSERVABLE_PROPERTIES);

/**
 * Атрибуция здесь ВЫВЕДЕНА, а не зафиксирована вызовом: отчёт 25 августа описывает
 * состояние очереди на конец прогона, а не вызов инструмента. Вывод однозначен —
 * править описание очереди у сервера умеет только `update_queue` (правило
 * `tests/live-runs/README.md`, случай «эффект не может принадлежать никакому другому
 * вызову прогона»), и независимо подтверждён соседним отчётом
 * `0_LIVE_RUN_REPORT_2026-08-26.md` — строкой таблицы версий «`update_queue`,
 * `update_board`, `update_board_column`, `update_worklog` | не шлёт | работают без
 * версии (живые пробы 25 и 26 августа)», где `update_queue` назван поимённо.
 * Ссылка цитатой, а не номером строки: номера в редактируемом документе не переживают
 * правок выше по тексту (ровно это и случилось с прежней ссылкой).
 */
const UPDATE_QUEUE_READ_BACK =
  'очередь `TESTSWEEP`: состояние на конец прогона прочитано — версия 2, описание ' +
  '«описание правленое»; атрибуция выведена (правка описания очереди принадлежит только ' +
  '`update_queue`) и подтверждена отчётом 26 августа';

const UPDATE_QUEUE_RESTAMP = {
  afterCommit: 'b1198193',
  why:
    'Коммит удалил из схемы параметр `issueTypes` (BREAKING CHANGE) через 1ч51м после ' +
    'коммита отчёта. Наблюдение правку пережило: его содержание — правка описания с ' +
    'обратным чтением, `issueTypes` в пробе не участвовал и работать не мог — живая ' +
    'проба того же дня дала `400 issueTypes: Incorrect data format` (тело коммита ' +
    '`b1198193`; тот же ответ у создания очереди зафиксирован отчётом строкой ' +
    '«`create_queue` с `issueTypes` | `400` | параметра больше нет»). ' +
    'То есть правка сузила контракт ровно на ту часть, которую наблюдение не ' +
    'свидетельствовало.',
} as const;

/**
 * Снято по двум отчётам прогонов, лежащим рядом в `tests/live-runs/`. Критерий
 * записи — эффект ПРОЧИТАН ОБРАТНО: строка отчёта вида «200» записи не даёт,
 * «версия 1→2, чтение подтверждает» — даёт. Инструмент, наблюдавшийся живьём,
 * оказавшийся сломанным и проверенный повторно после починки под той же меткой,
 * запись получает: наблюдение состоялось, и именно оно доказало починку.
 *
 * Перечень кандидатов и то, чего способ не видит, —
 * `tests/live-runs/live-observations-derived.md`.
 *
 * **`schemaFingerprint` этих 21 инструмента проставлен от ТЕКУЩЕГО кода**, а не от кода
 * на дату прогонов: исторических отпечатков взять неоткуда, поле заведено позже
 * прогонов. Что это значит для каждой записи — снято сплошной сверкой, а не выборкой:
 * `tests/live-runs/schema-history-vs-runs.md` (там же скрипт повтора сверки и перечень
 * того, чего способ не видит). Факт по состоянию на 2026-08-26: у 20 инструментов из 21
 * ни один файл, влияющий на `inputSchema`, после коммита их отчёта не менялся; у
 * `update_queue` схема изменена коммитом `b1198193` (2026-08-25 23:29) ПОСЛЕ коммита
 * отчёта `8e223af3` (21:38) — его записи поэтому несут `fingerprintRestamp` с
 * обоснованием, а не молчаливо совпавший отпечаток.
 *
 * Прежняя формулировка «последний коммит у каждой из 21 схемы принадлежит одной из этих
 * починок» была обобщением по множеству, множеству не соответствующим (у десяти
 * инструментов последний коммит — `1ac8b514`/`4f49aa0f`, к прогонам отношения не
 * имеющие), и именно она прятала случай `update_queue`.
 *
 * Дальше отпечаток живёт сам: любая следующая правка схемы уронит `coverage:check`.
 */
export const LIVE_OBSERVATIONS: readonly LiveObservation[] = [
  {
    tool: 'create_issue',
    property: 'С-4',
    runLabel: 'sweep7-2026-08-26',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
    readBack:
      'задача `TEST-25` создана в очереди `TEST`; чтение `get_issues` отдаёт её поля, включая выставленного следом исполнителя',
    schemaFingerprint: '385d2fa94ff9',
  },
  {
    tool: 'create_issue',
    property: 'С-5',
    runLabel: 'sweep7-2026-08-26',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
    readBack:
      'задача `TEST-25` создана в очереди `TEST`; чтение `get_issues` отдаёт её поля, включая выставленного следом исполнителя',
    schemaFingerprint: '385d2fa94ff9',
  },
  {
    tool: 'update_issue',
    property: 'С-4',
    runLabel: 'sweep7-2026-08-26',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
    readBack: '`assignee` на `TEST-25`: чтение `get_issues` отдаёт исполнителя',
    schemaFingerprint: '1d31784ff9e0',
  },
  {
    tool: 'update_issue',
    property: 'С-5',
    runLabel: 'sweep7-2026-08-26',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
    readBack: '`assignee` на `TEST-25`: чтение `get_issues` отдаёт исполнителя',
    schemaFingerprint: '1d31784ff9e0',
  },
  {
    tool: 'get_issues',
    property: 'С-4',
    runLabel: 'sweep7-2026-08-26',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
    readBack:
      'прочитала `TEST-25` на живых данных и вернула исполнителя, выставленного `update_issue`',
    schemaFingerprint: 'e170b50752de',
  },
  {
    tool: 'add_worklog',
    property: 'С-4',
    runLabel: 'sweep7-2026-08-26',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
    readBack: 'worklog `71` внутри `TEST-25`; чтение `get_worklogs` отдаёт его с началом `10:00`',
    schemaFingerprint: '63e05d4bb887',
  },
  {
    tool: 'add_worklog',
    property: 'С-5',
    runLabel: 'sweep7-2026-08-26',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
    readBack: 'worklog `71` внутри `TEST-25`; чтение `get_worklogs` отдаёт его с началом `10:00`',
    schemaFingerprint: '63e05d4bb887',
  },
  {
    tool: 'update_worklog',
    property: 'С-4',
    runLabel: 'sweep7-2026-08-26',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
    readBack: '`start` worklog `71`: `10:00` → `15:30`, чтение `get_worklogs` подтверждает',
    schemaFingerprint: '6f2ff7721ede',
  },
  {
    tool: 'update_worklog',
    property: 'С-5',
    runLabel: 'sweep7-2026-08-26',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
    readBack: '`start` worklog `71`: `10:00` → `15:30`, чтение `get_worklogs` подтверждает',
    schemaFingerprint: '6f2ff7721ede',
  },
  {
    tool: 'get_worklogs',
    property: 'С-4',
    runLabel: 'sweep7-2026-08-26',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
    readBack: 'прочитала worklog `71` задачи `TEST-25` до и после правки `start`',
    schemaFingerprint: '291ca1fd5955',
  },
  {
    tool: 'create_board',
    property: 'С-4',
    runLabel: 'sweep7-2026-08-26',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
    readBack:
      'доска `108`; чтение отдаёт очередь в `autoFilterSettings.addFilterSettings.liveFilter` — этим чтением снята ложная тревога «`queue` не доезжает»',
    schemaFingerprint: '0ad5bbc78b63',
  },
  {
    tool: 'create_board',
    property: 'С-5',
    runLabel: 'sweep7-2026-08-26',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
    readBack:
      'доска `108`; чтение отдаёт очередь в `autoFilterSettings.addFilterSettings.liveFilter` — этим чтением снята ложная тревога «`queue` не доезжает»',
    schemaFingerprint: '0ad5bbc78b63',
  },
  {
    tool: 'update_board',
    property: 'С-4',
    runLabel: 'sweep7-2026-08-26',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
    readBack:
      'доска `108`: `orderBy`/`orderAsc` вместе с `filter` — чтение отдаёт `priority`/`true`, версия 1→2; `useRanking` `false`→`true`, версия 2→3',
    schemaFingerprint: '9a791a935795',
  },
  {
    tool: 'update_board',
    property: 'С-5',
    runLabel: 'sweep7-2026-08-26',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
    readBack:
      'доска `108`: `orderBy`/`orderAsc` вместе с `filter` — чтение отдаёт `priority`/`true`, версия 1→2; `useRanking` `false`→`true`, версия 2→3',
    schemaFingerprint: '9a791a935795',
  },
  {
    tool: 'update_board_column',
    property: 'С-4',
    runLabel: 'sweep-2026-08-25',
    report: 'tests/live-runs/2_LIVE_RUN_REPORT_2026-08-25c.md',
    readBack: 'колонка `1` доски `106`: выставлен `limit: 5`, чтение подтверждает',
    schemaFingerprint: '080128d8b343',
  },
  {
    tool: 'update_board_column',
    property: 'С-5',
    runLabel: 'sweep-2026-08-25',
    report: 'tests/live-runs/2_LIVE_RUN_REPORT_2026-08-25c.md',
    readBack: 'колонка `1` доски `106`: выставлен `limit: 5`, чтение подтверждает',
    schemaFingerprint: '080128d8b343',
  },
  {
    tool: 'create_sprint',
    property: 'С-4',
    runLabel: 'sweep7-2026-08-26',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
    readBack:
      'спринт `236` прогона прочитан независимо позже: `update_sprint` дал версию 1→2, `archive` — 3→4. Параметр `status` пробовался на спринте `237`, который прогон удалил, и обратно НЕ читался — этой записью он не свидетельствуется',
    schemaFingerprint: 'e24081c84404',
  },
  {
    tool: 'create_sprint',
    property: 'С-5',
    runLabel: 'sweep7-2026-08-26',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
    readBack:
      'спринт `236` прогона прочитан независимо позже: `update_sprint` дал версию 1→2, `archive` — 3→4. Параметр `status` пробовался на спринте `237`, который прогон удалил, и обратно НЕ читался — этой записью он не свидетельствуется',
    schemaFingerprint: 'e24081c84404',
  },
  {
    tool: 'update_sprint',
    property: 'С-4',
    runLabel: 'sweep7-2026-08-26',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
    readBack:
      'спринт `236` после починки: без версии 200 и версия 1→2 (предупреждение `VERSION_NOT_PROVIDED`), с версией от вызывающего — 2→3',
    schemaFingerprint: '2be24d7e024c',
  },
  {
    tool: 'update_sprint',
    property: 'С-5',
    runLabel: 'sweep7-2026-08-26',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
    readBack:
      'спринт `236` после починки: без версии 200 и версия 1→2 (предупреждение `VERSION_NOT_PROVIDED`), с версией от вызывающего — 2→3',
    schemaFingerprint: '2be24d7e024c',
  },
  {
    tool: 'manage_sprint_lifecycle',
    property: 'С-4',
    runLabel: 'sweep7-2026-08-26',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
    readBack:
      '`archive` спринта `236` — версия 3→4; `delete` спринта `237` — спринт исчез. `start` спринта `238` этой записью НЕ свидетельствуется: отчёт даёт по нему только код ответа',
    schemaFingerprint: '15ce6217fa2a',
  },
  {
    tool: 'manage_sprint_lifecycle',
    property: 'С-5',
    runLabel: 'sweep7-2026-08-26',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
    readBack:
      '`archive` спринта `236` — версия 3→4; `delete` спринта `237` — спринт исчез. `start` спринта `238` этой записью НЕ свидетельствуется: отчёт даёт по нему только код ответа',
    schemaFingerprint: '15ce6217fa2a',
  },
  {
    tool: 'create_queue',
    property: 'С-4',
    runLabel: 'sweep-2026-08-25',
    report: 'tests/live-runs/2_LIVE_RUN_REPORT_2026-08-25c.md',
    readBack: 'очередь `TESTSWEEP` создана с `description`, чтение подтверждает описание',
    schemaFingerprint: '6e40b47ee9bf',
  },
  {
    tool: 'create_queue',
    property: 'С-5',
    runLabel: 'sweep-2026-08-25',
    report: 'tests/live-runs/2_LIVE_RUN_REPORT_2026-08-25c.md',
    readBack: 'очередь `TESTSWEEP` создана с `description`, чтение подтверждает описание',
    schemaFingerprint: '6e40b47ee9bf',
  },
  {
    tool: 'update_queue',
    property: 'С-4',
    runLabel: 'sweep-2026-08-25',
    report: 'tests/live-runs/2_LIVE_RUN_REPORT_2026-08-25c.md',
    readBack: UPDATE_QUEUE_READ_BACK,
    schemaFingerprint: 'c7a9d1e0debb',
    fingerprintRestamp: UPDATE_QUEUE_RESTAMP,
  },
  {
    tool: 'update_queue',
    property: 'С-5',
    runLabel: 'sweep-2026-08-25',
    report: 'tests/live-runs/2_LIVE_RUN_REPORT_2026-08-25c.md',
    readBack: UPDATE_QUEUE_READ_BACK,
    schemaFingerprint: 'c7a9d1e0debb',
    fingerprintRestamp: UPDATE_QUEUE_RESTAMP,
  },
  {
    tool: 'manage_queue_access',
    property: 'С-4',
    runLabel: 'sweep7-2026-08-26',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
    readBack:
      'очередь `TESTSWEEPB`: `write`/`users`/`add [vr]` — `GET` того же ресурса отдаёт `vr` в `write.users`, версия 1→2; `grant` — то же, версия 2→3. `permission: read` на этой очереди 200 отдаёт, а `read.users`/`read.roles` не меняет — это наблюдение об API (очередь открыта на чтение всей организации), не о маршруте инструмента; снимет его проба на очереди с ограниченным доступом',
    schemaFingerprint: '743ad133fe19',
  },
  {
    tool: 'manage_queue_access',
    property: 'С-5',
    runLabel: 'sweep7-2026-08-26',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
    readBack:
      'очередь `TESTSWEEPB`: `write`/`users`/`add [vr]` — `GET` того же ресурса отдаёт `vr` в `write.users`, версия 1→2; `grant` — то же, версия 2→3. `permission: read` на этой очереди 200 отдаёт, а `read.users`/`read.roles` не меняет — это наблюдение об API (очередь открыта на чтение всей организации), не о маршруте инструмента; снимет его проба на очереди с ограниченным доступом',
    schemaFingerprint: '743ad133fe19',
  },
  {
    tool: 'create_queue_local_field',
    property: 'С-4',
    runLabel: 'sweep7-2026-08-26',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
    readBack:
      'локальное поле `sweep7Local` очереди `TEST` создано прогоном и прочитано независимо при проверке правки — версия 1→2',
    schemaFingerprint: 'eb6f6b87c6ee',
  },
  {
    tool: 'create_queue_local_field',
    property: 'С-5',
    runLabel: 'sweep7-2026-08-26',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
    readBack:
      'локальное поле `sweep7Local` очереди `TEST` создано прогоном и прочитано независимо при проверке правки — версия 1→2',
    schemaFingerprint: 'eb6f6b87c6ee',
  },
  {
    tool: 'update_queue_local_field',
    property: 'С-4',
    runLabel: 'sweep7-2026-08-26',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
    readBack:
      'локальное поле `sweep7Local` очереди `TEST`: версия 1→2, чтение подтверждает — версия в запросе не участвует',
    schemaFingerprint: 'a50106cb94c3',
  },
  {
    tool: 'update_queue_local_field',
    property: 'С-5',
    runLabel: 'sweep7-2026-08-26',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
    readBack:
      'локальное поле `sweep7Local` очереди `TEST`: версия 1→2, чтение подтверждает — версия в запросе не участвует',
    schemaFingerprint: 'a50106cb94c3',
  },
  {
    tool: 'create_filter',
    property: 'С-4',
    runLabel: 'sweep7-2026-08-26',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
    readBack:
      'фильтр `7` создан прогоном и прочитан прямым `GET /v3/filters/7` при проверке переименования',
    schemaFingerprint: '5226c17a015f',
  },
  {
    tool: 'create_filter',
    property: 'С-5',
    runLabel: 'sweep7-2026-08-26',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
    readBack:
      'фильтр `7` создан прогоном и прочитан прямым `GET /v3/filters/7` при проверке переименования',
    schemaFingerprint: '5226c17a015f',
  },
  {
    tool: 'update_filter',
    property: 'С-4',
    runLabel: 'sweep7-2026-08-26',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
    readBack:
      'фильтр `7` переименован, прямое чтение `GET /v3/filters/7` подтверждает — версия в запросе не участвует',
    schemaFingerprint: 'adc6e3ff5919',
  },
  {
    tool: 'update_filter',
    property: 'С-5',
    runLabel: 'sweep7-2026-08-26',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
    readBack:
      'фильтр `7` переименован, прямое чтение `GET /v3/filters/7` подтверждает — версия в запросе не участвует',
    schemaFingerprint: 'adc6e3ff5919',
  },
  {
    tool: 'create_component',
    property: 'С-4',
    runLabel: 'sweep-2026-08-25',
    report: 'tests/live-runs/2_LIVE_RUN_REPORT_2026-08-25c.md',
    readBack:
      'компонент `31` очереди `TEST` создан прогоном и прочитан независимо при проверке правки — версия 1→2, на конец прогона 3',
    schemaFingerprint: '1843d5a86db8',
  },
  {
    tool: 'create_component',
    property: 'С-5',
    runLabel: 'sweep-2026-08-25',
    report: 'tests/live-runs/2_LIVE_RUN_REPORT_2026-08-25c.md',
    readBack:
      'компонент `31` очереди `TEST` создан прогоном и прочитан независимо при проверке правки — версия 1→2, на конец прогона 3',
    schemaFingerprint: '1843d5a86db8',
  },
  {
    tool: 'update_component',
    property: 'С-4',
    runLabel: 'sweep-2026-08-25',
    report: 'tests/live-runs/2_LIVE_RUN_REPORT_2026-08-25c.md',
    readBack: 'компонент `31`: без версии 200 и версия 1→2, с версией от вызывающего — 2→3',
    schemaFingerprint: 'dec1ecc8e4eb',
  },
  {
    tool: 'update_component',
    property: 'С-5',
    runLabel: 'sweep-2026-08-25',
    report: 'tests/live-runs/2_LIVE_RUN_REPORT_2026-08-25c.md',
    readBack: 'компонент `31`: без версии 200 и версия 1→2, с версией от вызывающего — 2→3',
    schemaFingerprint: 'dec1ecc8e4eb',
  },
];

export const LIVE_UNREACHABLE: readonly LiveUnreachable[] = [
  {
    tool: 'create_global_field',
    property: 'С-4',
    reason:
      'дефект D10 жив: `POST /v3/fields` отвечает `500` на категориях `…0001` и `…0003`, поле не создаётся (прямой `GET` даёт 404). Код `500` маршрут не подтверждает и эффекта для обратного чтения не оставляет',
    whatWouldClose:
      'успешный ответ `create_global_field` в прогоне и прямое чтение созданного поля',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
  },
  {
    tool: 'create_global_field',
    property: 'С-5',
    reason:
      'дефект D10 жив: `POST /v3/fields` отвечает `500` на категориях `…0001` и `…0003`, поле не создаётся (прямой `GET` даёт 404). Код `500` маршрут не подтверждает и эффекта для обратного чтения не оставляет',
    whatWouldClose:
      'успешный ответ `create_global_field` в прогоне и прямое чтение созданного поля',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
  },
  {
    tool: 'update_global_field',
    property: 'С-4',
    reason:
      'живьём недостижим, пока жив D10: править нечего — `create_global_field` поля не создаёт, а чужое глобальное поле рубеж прогона отклоняет (`tests/TESTING_STRATEGY.md` §1, допуск по владению прогоном)',
    whatWouldClose:
      'починка D10, затем правка `options`/`suggest` на созданном прогоном поле с обратным чтением',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
  },
  {
    tool: 'update_global_field',
    property: 'С-5',
    reason:
      'живьём недостижим, пока жив D10: править нечего — `create_global_field` поля не создаёт, а чужое глобальное поле рубеж прогона отклоняет (`tests/TESTING_STRATEGY.md` §1, допуск по владению прогоном)',
    whatWouldClose:
      'починка D10, затем правка `options`/`suggest` на созданном прогоном поле с обратным чтением',
    report: 'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md',
  },
];

/**
 * Снятые живые наблюдения — третий, честный выход из расхождения отпечатка.
 *
 * Пуст сегодня, и это не мёртвый код: ветка достижима с первой же записи, а без неё
 * единственным посильным ответом на расхождение оставалась пере-штамповка, которая
 * ничем не проверяется. Правила записи и её взаимодействие с храповиком —
 * `RetiredLiveObservation` в `types.ts` и `coverage-gate-baseline.ts`.
 */
export const RETIRED_LIVE_OBSERVATIONS: readonly RetiredLiveObservation[] = [];

export interface LiveRegistryValidationOptions {
  readonly observations: readonly LiveObservation[];
  readonly unreachable: readonly LiveUnreachable[];
  /** Снятые наблюдения; по умолчанию — боевой реестр (самотест подставляет свой). */
  readonly retired?: readonly RetiredLiveObservation[];
  /** Базовые имена зарегистрированных инструментов (`knownToolBaseNames()`). */
  readonly validTools: ReadonlySet<string>;
  /** Корень, относительно которого разрешаются пути `report`. */
  readonly packageRoot: string;
}

function pairKey(tool: string, property: LiveObservableProperty): string {
  return `${tool}[${property}]`;
}

function requireNonEmpty(value: string, field: string, where: string): void {
  if (value.trim().length === 0) {
    throw new Error(
      `tests/coverage-exceptions/live-observations.ts: ${where} — поле "${field}" пусто или ` +
        `состоит из пробелов. Запись без него не свидетельствует ни о чём.`
    );
  }
}

const COMMIT_HASH = /^[0-9a-f]{7,40}$/;

/**
 * Проверяется ФОРМА, и только она: `afterCommit: 'потом'` реестр принимал, а прочитать
 * такую правку нельзя. Существование коммита не проверяется намеренно — валидация
 * реестра не ходит в git (тесты гоняются и на выгрузке без истории, и на shallow-клоне
 * в CI), поэтому «этот коммит есть и он про эту схему» остаётся на ревью. Граница
 * названа здесь и в JSDoc `FingerprintRestamp`, чтобы её не приняли за проверку.
 */
function requireCommitish(value: string, field: string, where: string): void {
  if (!COMMIT_HASH.test(value.trim())) {
    throw new Error(
      `tests/coverage-exceptions/live-observations.ts: ${where} — поле "${field}" ` +
        `("${value}") не похоже на хеш коммита (7–40 hex). Правку, которую наблюдение ` +
        `пережило, обязано быть можно прочитать: без хеша поле не читается ничем.`
    );
  }
}

function requireKnownTool(tool: string, validTools: ReadonlySet<string>, where: string): void {
  if (!validTools.has(tool)) {
    throw new Error(
      `tests/coverage-exceptions/live-observations.ts: ${where} ссылается на несуществующий ` +
        `инструмент "${tool}" — сверьте базовое имя (без префикса сервера) с TOOL_CLASSES.`
    );
  }
}

function requireLiveProperty(property: string, where: string): void {
  if (!VALID_LIVE_PROPERTIES.has(property)) {
    throw new Error(
      `tests/coverage-exceptions/live-observations.ts: ${where} ссылается на свойство ` +
        `"${property}" — живой прогон наблюдает только ${LIVE_OBSERVABLE_PROPERTIES.join('/')}.`
    );
  }
}

const LIVE_RUNS_DIR = 'tests/live-runs/';

/**
 * Имя файла отчёта прогона. Конвенция нормативна и записана в
 * `tests/live-runs/README.md`: каталог держит и документы о себе (`README.md`), и
 * отчёты, а доказательством является только второе.
 */
const LIVE_RUN_REPORT_NAME = /(^|\/)\d+_LIVE_RUN_REPORT_\d{4}-\d{2}-\d{2}[a-z]?\.md$/;

/**
 * Имя инструмента ищется по границе идентификатора, а не подстрокой.
 *
 * Среди 85 базовых имён 12 пар находятся в отношении «префикс» (`get_queue` ⊂
 * `get_queue_fields`, `create_board` ⊂ `create_board_column` и так далее): при поиске
 * подстрокой отчёт, называющий только длинное имя, засчитывался бы за короткое.
 * Направление отказа остаётся безопасным — ложный красный лечится тем, что имя
 * дописывают в отчёт по правилу README.
 *
 * Засчитываются ОБЕ формы имени, потому что обе канонические: базовое
 * (`update_board` — форма реестра и матрицы) и с префиксом сервера
 * (`fr_yandex_tracker_update_board` — форма, которую предписывает корневой `CLAUDE.md`
 * §«Дев-интерфейс вызова инструментов» и которую печатает `tools:list`). Голая граница
 * идентификатора отвергала вторую: префикс кончается на `_`, и lookbehind её съедал —
 * отчёт, написанный по правилу, не проходил бы сверку, называя инструмент.
 * Полное имя MCP-клиента (`mcp__…__fr_yandex_tracker_update_board`) засчитывается
 * только вместе с префиксом сервера: `__` перед голым базовым именем границей не
 * считается, иначе отношение «префикс» перестало бы отсекаться.
 */
function mentionsToolName(text: string, tool: string): boolean {
  const bare = `(?<![A-Za-z0-9_])(?:${MCP_TOOL_PREFIX})?${tool}(?![A-Za-z0-9_])`;
  const mcpQualified = `(?<=__)${MCP_TOOL_PREFIX}${tool}(?![A-Za-z0-9_])`;
  return new RegExp(`${bare}|${mcpQualified}`).test(text);
}

/**
 * Отчёт обязан не просто существовать, а СВИДЕТЕЛЬСТВОВАТЬ эту запись. Проверка
 * одним `existsSync` пропускала ссылку на любой существующий файл — например, на
 * `tests/live-runs/README.md`, — и клетка `живьём` получалась из документа, где о
 * наблюдении не сказано ничего.
 *
 * Четыре условия, каждое машинно проверяемое:
 * - путь ведёт в `tests/live-runs/` (каталог входит в `inputs` задач `coverage:*` в
 *   `turbo.json`; отчёт вне его пропадёт из-под кэша незамеченным);
 * - имя файла — имя ОТЧЁТА прогона (`{N}_LIVE_RUN_REPORT_{дата}.md`). Без этого
 *   условия названный выше контрпример стал проходящим входом ровно тогда, когда в
 *   каталоге появился `README.md`: он содержит и имена инструментов (в тексте
 *   правила), и обе метки прогонов (в таблице отчётов);
 * - отчёт называет базовое имя инструмента записи — по границе идентификатора;
 * - отчёт называет метку прогона (`runLabel`) — у `LiveUnreachable` метки нет, там
 *   условие не применяется.
 *
 * Чего проверка НЕ обещает: что найденное упоминание относится именно к этому
 * свойству и что `readBack` соответствует тексту отчёта. Это остаётся на ревью —
 * барьер отсекает ссылку не на тот документ, а не пересказ отчёта своими словами.
 */
function requireReportSupportsRecord(
  report: string,
  runLabel: string | undefined,
  context: { readonly tool: string; readonly packageRoot: string; readonly where: string }
): void {
  const { tool, packageRoot, where } = context;
  const prefix = `tests/coverage-exceptions/live-observations.ts: ${where}`;

  if (!report.startsWith(LIVE_RUNS_DIR) || report.includes('..')) {
    throw new Error(
      `${prefix} ссылается на отчёт "${report}" вне ${LIVE_RUNS_DIR}. Только этот каталог ` +
        `перечислен в inputs задач coverage:* (turbo.json) — отчёт снаружи пропадёт из-под ` +
        `кэша незамеченным.`
    );
  }

  if (!LIVE_RUN_REPORT_NAME.test(report)) {
    throw new Error(
      `${prefix} ссылается на "${report}" — это не отчёт прогона. Отчёт называется ` +
        `{N}_LIVE_RUN_REPORT_{ГГГГ-ММ-ДД}.md (конвенция ${LIVE_RUNS_DIR}README.md): в каталоге ` +
        `лежит и документ о самом каталоге, и он содержит и имена инструментов, и метки ` +
        `прогонов — то есть проходил бы сверку по тексту, ничего не свидетельствуя.`
    );
  }

  const absolute = join(packageRoot, report);
  if (!existsSync(absolute)) {
    throw new Error(
      `${prefix} ссылается на отчёт "${report}", которого нет на диске. Отчёты живых прогонов ` +
        `живут в ${LIVE_RUNS_DIR} именно затем, чтобы ссылка не пережила доказательство.`
    );
  }

  const text = readFileSync(absolute, 'utf8');
  const missing: string[] = [];
  if (!mentionsToolName(text, tool)) {
    missing.push(`имени инструмента "${tool}"`);
  }
  if (runLabel !== undefined && !text.includes(runLabel)) {
    missing.push(`метки прогона "${runLabel}"`);
  }
  if (missing.length > 0) {
    throw new Error(
      `${prefix} ссылается на отчёт "${report}", в котором нет ${missing.join(' и ')}. ` +
        `Отчёт обязан свидетельствовать запись, а не просто существовать: сослаться можно ` +
        `на любой файл каталога, и клетка "живьём" получилась бы из документа, где о ` +
        `наблюдении не сказано ничего.`
    );
  }
}

/**
 * Валидация реестра. Параметризована (как `validateLegacyMockTestList`), чтобы
 * самотест гонял её на синтетических записях, не трогая боевые константы и не читая
 * реальное дерево `tests/live-runs/`.
 *
 * Одновременное присутствие `LiveObservation` и `LiveUnreachable` на одну пару
 * (инструмент, свойство) — ошибка, а не приоритет одной над другой: запись
 * «недостижимо» устарела в тот момент, когда наблюдение состоялось, и молчаливый
 * приоритет воспроизвёл бы ровно ту устаревшую посылку, ради снятия которой реестр
 * заведён.
 */
export function validateLiveRegistry(options: LiveRegistryValidationOptions): void {
  const { observations, unreachable, validTools, packageRoot } = options;
  const retired = options.retired ?? RETIRED_LIVE_OBSERVATIONS;

  const observedPairs = new Set<string>();
  for (const observation of observations) {
    const where = `LiveObservation ${pairKey(observation.tool, observation.property)}`;
    requireKnownTool(observation.tool, validTools, where);
    requireLiveProperty(observation.property, where);
    requireNonEmpty(observation.runLabel, 'runLabel', where);
    requireNonEmpty(observation.report, 'report', where);
    requireNonEmpty(observation.readBack, 'readBack', where);
    requireNonEmpty(observation.schemaFingerprint, 'schemaFingerprint', where);
    if (observation.fingerprintRestamp !== undefined) {
      requireNonEmpty(
        observation.fingerprintRestamp.afterCommit,
        'fingerprintRestamp.afterCommit',
        where
      );
      requireCommitish(
        observation.fingerprintRestamp.afterCommit,
        'fingerprintRestamp.afterCommit',
        where
      );
      requireNonEmpty(observation.fingerprintRestamp.why, 'fingerprintRestamp.why', where);
    }
    requireReportSupportsRecord(observation.report, observation.runLabel, {
      tool: observation.tool,
      packageRoot,
      where,
    });

    const key = pairKey(observation.tool, observation.property);
    if (observedPairs.has(key)) {
      throw new Error(
        `tests/coverage-exceptions/live-observations.ts: две записи LiveObservation на одну пару ` +
          `${key} — клетка матрицы сослалась бы на случайный из двух отчётов.`
      );
    }
    observedPairs.add(key);
  }

  const unreachablePairs = new Set<string>();
  for (const record of unreachable) {
    const where = `LiveUnreachable ${pairKey(record.tool, record.property)}`;
    requireKnownTool(record.tool, validTools, where);
    requireLiveProperty(record.property, where);
    requireNonEmpty(record.reason, 'reason', where);
    requireNonEmpty(record.whatWouldClose, 'whatWouldClose', where);
    requireNonEmpty(record.report, 'report', where);
    requireReportSupportsRecord(record.report, undefined, {
      tool: record.tool,
      packageRoot,
      where,
    });

    const key = pairKey(record.tool, record.property);
    if (unreachablePairs.has(key)) {
      throw new Error(
        `tests/coverage-exceptions/live-observations.ts: две записи LiveUnreachable на одну пару ` +
          `${key} — оставь одну, с той причиной, которая действует.`
      );
    }
    unreachablePairs.add(key);

    if (observedPairs.has(key)) {
      throw new Error(
        `tests/coverage-exceptions/live-observations.ts: на пару ${key} есть и LiveObservation, и ` +
          `LiveUnreachable. Запись «недостижимо» устарела в тот момент, когда наблюдение ` +
          `состоялось — удали LiveUnreachable, а не полагайся на приоритет одной записи.`
      );
    }
  }

  const retiredPairs = new Set<string>();
  for (const record of retired) {
    const where = `RetiredLiveObservation ${pairKey(record.tool, record.property)}`;
    requireKnownTool(record.tool, validTools, where);
    requireLiveProperty(record.property, where);
    requireNonEmpty(record.runLabel, 'runLabel', where);
    requireNonEmpty(record.report, 'report', where);
    requireNonEmpty(record.reason, 'reason', where);
    requireNonEmpty(record.whatWouldClose, 'whatWouldClose', where);
    requireReportSupportsRecord(record.report, record.runLabel, {
      tool: record.tool,
      packageRoot,
      where,
    });

    const key = pairKey(record.tool, record.property);
    if (retiredPairs.has(key)) {
      throw new Error(
        `tests/coverage-exceptions/live-observations.ts: две записи RetiredLiveObservation на ` +
          `одну пару ${key} — оставь одну, с той причиной, которая действует.`
      );
    }
    retiredPairs.add(key);

    if (observedPairs.has(key)) {
      throw new Error(
        `tests/coverage-exceptions/live-observations.ts: на пару ${key} есть и LiveObservation, и ` +
          `RetiredLiveObservation. Наблюдение либо снято, либо действует — запись о снятии ` +
          `устарела в тот момент, когда пара снова стала наблюдаться, удали её.`
      );
    }
  }
}

/** Ключи снятых наблюдений — то, что храповик покрытия обязан отличать от потерянного теста. */
export function retiredLiveKeys(
  retired: readonly RetiredLiveObservation[] = RETIRED_LIVE_OBSERVATIONS
): ReadonlySet<string> {
  return new Set(retired.map((record) => pairKey(record.tool, record.property)));
}

export interface FingerprintMismatch {
  readonly tool: string;
  readonly property: LiveObservableProperty;
  readonly recorded: string;
  /** `undefined` — схему инструмента прочитать не удалось; это расхождение, а не пропуск. */
  readonly actual: string | undefined;
  /**
   * Текст ошибки чтения схемы, когда `actual` не получен. Без него отказ говорил
   * «схему прочитать не удалось» и терял причину навсегда — а причина («инструмент не
   * инстанцируется», «getDefinition бросил») лечится по-разному.
   */
  readonly readError?: string;
}

/**
 * Записи, чей отпечаток разошёлся с текущей схемой инструмента.
 *
 * `fingerprintOf` передаётся вызывающим (`scripts/build-coverage-matrix.ts` считает
 * его через `computeToolSchemaFingerprint` по `TOOL_CLASSES`) — иначе реестр тестов
 * тянул бы за собой composition root ради одной строки, а самотест не смог бы
 * подставить синтетические отпечатки.
 *
 * Нечитаемая схема (`undefined`) считается расхождением: барьер, отчитывающийся
 * зелёным там, где он не смог прочитать схему, — не барьер.
 */
export function collectFingerprintMismatches(
  observations: readonly LiveObservation[],
  fingerprintOf: (tool: string) => string | undefined,
  readErrorOf: (tool: string) => string | undefined = () => undefined
): FingerprintMismatch[] {
  const mismatches: FingerprintMismatch[] = [];
  for (const observation of observations) {
    const actual = fingerprintOf(observation.tool);
    if (actual !== observation.schemaFingerprint) {
      const readError = actual === undefined ? readErrorOf(observation.tool) : undefined;
      mismatches.push({
        tool: observation.tool,
        property: observation.property,
        recorded: observation.schemaFingerprint,
        actual,
        ...(readError === undefined ? {} : { readError }),
      });
    }
  }
  return mismatches;
}

/**
 * Текст отказа. Обязан говорить, ЧТО делать, а не только что не сошлось: запись,
 * которую непонятно как чинить, чинят удалением.
 *
 * Оговорка про непокрытый маршрут стоит в тексте отказа намеренно — читатель
 * отказа единственный, кто в этот момент решает, доверять ли совпадению
 * отпечатков у остальных записей.
 */
export function formatFingerprintMismatchFailure(
  mismatches: readonly FingerprintMismatch[]
): string {
  const lines = mismatches.map((mismatch) => {
    const actual =
      mismatch.actual ??
      `<схему прочитать не удалось: ${mismatch.readError ?? 'причина не сохранена'}>`;
    const baselineHint = isGatedProperty(mismatch.property)
      ? 'при снятии наблюдения нужна строка базлайна'
      : 'при снятии наблюдения строка базлайна НЕ нужна (свойство вне гейта)';
    return (
      `  - ${mismatch.tool} [${mismatch.property}]: в реестре "${mismatch.recorded}", ` +
      `у текущего кода "${actual}" — ${baselineHint}`
    );
  });

  return (
    `coverage:matrix/coverage:check: у ${String(mismatches.length)} записей LiveObservation отпечаток схемы ` +
    `разошёлся с текущим кодом инструмента — наблюдение относится к другой версии ` +
    `контракта:\n${lines.join('\n')}\n` +
    `Что делать — три выхода, и третий такой же законный, как первые два:\n` +
    `  1) перепроверь инструмент живьём и запиши новое наблюдение (runLabel, report, ` +
    `readBack — заново);\n` +
    `  2) пере-штампуй запись: текущий отпечаток плюс поле fingerprintRestamp ` +
    `{afterCommit, why} — обоснование, почему прежнее наблюдение правку схемы пережило. ` +
    `Годится, только когда правка не касается того, что наблюдение свидетельствует;\n` +
    `  3) сними наблюдение: удали LiveObservation и заведи RetiredLiveObservation на ту же ` +
    `пару. Строка в COVERAGE_GATE_BASELINE нужна ТОЛЬКО для свойств, входящих в гейт ` +
    `покрытия (${GATED_PROPERTIES.join('/')}): у них снятая клетка становится дырой. Для ` +
    `С-5 строку дописывать НЕЛЬЗЯ — это свойство гейт не сверяет, и строка tool[С-5] сразу ` +
    `попадёт в «строки базлайна перестали быть дырами», то есть даст вечный красный. Это ` +
    `не «потеряли тест» — гейт различает два события и печатает разные диагнозы; строка ` +
    `базлайна без записи о снятии по-прежнему запрещена (сверка с ` +
    `COVERAGE_GATE_BASELINE_ORIGIN).\n` +
    `Оговорка — отпечаток видит только СХЕМУ ПАРАМЕТРОВ, и слепых пятна два:\n` +
    `  - МАРШРУТ (URL, метод, форма тела запроса) живёт в операции API и отпечатком не ` +
    `виден, хотя правильность маршрута — ровно то, что утверждает С-4;\n` +
    `  - ФОРМА ОТВЕТА (outputSchema, DTO разбора) в отпечаток не входит вовсе, хотя ` +
    `правдивость эффекта (С-5) читается именно через ответ. Класс не гипотетический: ` +
    `прогон 26 августа вскрыл PATCH .../permissions, отвечающий {self, version} при ` +
    `объявленном массиве.\n` +
    `Обе части остаются на ревью (tests/TESTING_STRATEGY.md §1).`
  );
}

export interface StaleLiveUnreachable {
  readonly tool: string;
  readonly property: LiveObservableProperty;
  readonly cellKind: string;
}

/**
 * Запись «недостижимо» устарела, если клетка матрицы на ту же пару стала `живьём`.
 *
 * Без этой проверки новый реестр копил бы мусор ровно так же, как копил его
 * категорийный список: `collectStaleExceptions` обходит только `CoverageException` и
 * про живой реестр не знает.
 *
 * Второй рубеж, а не мёртвый код: `scripts/build-coverage-matrix.ts` вызывает функцию на
 * каждом `--check`. Непустой список она сегодня вернуть не может — единственный источник
 * клетки `живьём` это тот же реестр, а конфликт пары ловится раньше, в
 * `validateLiveRegistry`, и до сюда дело не доходит. Рубеж действует, как только клетка
 * `живьём` придёт из источника вне этого реестра: тогда запись «недостижимо» обязана
 * обнулиться, а не сосуществовать с наблюдением.
 */
export function collectStaleLiveUnreachable(
  unreachable: readonly LiveUnreachable[],
  cellKindOf: (tool: string, property: LiveObservableProperty) => string | undefined
): StaleLiveUnreachable[] {
  return collectStaleByLiveCell(unreachable, cellKindOf);
}

export interface StaleRetiredObservation {
  readonly tool: string;
  readonly property: LiveObservableProperty;
  readonly cellKind: string;
}

/**
 * Запись о СНЯТИИ устарела ровно тогда же, когда запись «недостижимо»: пара снова
 * наблюдается живьём.
 *
 * Рубеж симметричен `collectStaleLiveUnreachable` и заведён по той же причине: без него
 * реестр снятых наблюдений копил бы мусор навсегда. Сегодня единственная защита —
 * бросок `validateLiveRegistry` на паре, у которой есть и наблюдение, и запись о снятии;
 * он закрывает только один из двух путей возврата клетки и срабатывает раньше, поэтому
 * непустой список эта функция сегодня вернуть не может — как и её сестра. Рубеж
 * действует, как только клетка `живьём` придёт из источника вне этого реестра.
 */
export function collectStaleRetiredObservations(
  retired: readonly RetiredLiveObservation[],
  cellKindOf: (tool: string, property: LiveObservableProperty) => string | undefined
): StaleRetiredObservation[] {
  return collectStaleByLiveCell(retired, cellKindOf);
}

/**
 * Текст отказа по устаревшим записям обоих живых реестров — рядом с самими реестрами, по
 * образцу `formatFingerprintMismatchFailure`. Пустой массив — устаревших записей нет.
 */
export function formatStaleLiveRegistryFailures(
  unreachable: readonly LiveUnreachable[],
  retired: readonly RetiredLiveObservation[],
  cellKindOf: (tool: string, property: LiveObservableProperty) => string | undefined
): string[] {
  const file = 'tests/coverage-exceptions/live-observations.ts';
  const sections = [
    {
      title: 'LiveUnreachable',
      lines: collectStaleLiveUnreachable(unreachable, cellKindOf).map(
        (stale) =>
          `  - ${stale.tool} [${stale.property}]: клетка стала "${stale.cellKind}" — ` +
          `наблюдение состоялось, удали запись из ${file}`
      ),
    },
    {
      title: 'RetiredLiveObservation',
      lines: collectStaleRetiredObservations(retired, cellKindOf).map(
        (stale) =>
          `  - ${stale.tool} [${stale.property}]: клетка снова "${stale.cellKind}" — наблюдение ` +
          `вернулось, удали запись о снятии из ${file} (и строку из базлайна, если она была)`
      ),
    },
  ];

  const out: string[] = [];
  for (const section of sections) {
    if (section.lines.length === 0) continue;
    out.push(
      `coverage:check: найдено ${String(section.lines.length)} устаревших записей ${section.title}:`,
      ...section.lines
    );
  }
  return out;
}

function collectStaleByLiveCell<T extends { tool: string; property: LiveObservableProperty }>(
  records: readonly T[],
  cellKindOf: (tool: string, property: LiveObservableProperty) => string | undefined
): { tool: string; property: LiveObservableProperty; cellKind: string }[] {
  const stale: { tool: string; property: LiveObservableProperty; cellKind: string }[] = [];
  for (const record of records) {
    const cellKind = cellKindOf(record.tool, record.property);
    if (cellKind === 'живьём') {
      stale.push({ tool: record.tool, property: record.property, cellKind });
    }
  }
  return stale;
}
