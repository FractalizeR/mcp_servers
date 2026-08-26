/**
 * Мутирующие запросы всех инструментов Трекера и ожидаемое решение рубежа.
 *
 * **Чем получено:** `npm run enumerate:requests` (scripts/enumerate-outgoing-requests.ts) —
 * обход `TOOL_CLASSES`, синтетический образец параметров из Zod-схемы, перехват на
 * `axios.defaults.adapter`. Снято на 92 инструментах: 80 запросов, из них 50 не-GET.
 *
 * **Чего этот способ не видит:** ветки, требующие правдоподобного ответа сервера
 * (второй запрос после чтения списка, вторая страница пагинации); инструменты,
 * упавшие на валидации синтетического образца. Появившийся мимо этой таблицы путь
 * рубеж отклонит как неописанный — политика fail-closed, — но отдельной строки
 * здесь у него не будет: таблицу обновляют повторным прогоном скрипта.
 *
 * **Строки компонента, доски, очереди и глобального поля правлены руками**
 * под `0_CONTRACTS.md`: этап 1.1 переводит рубеж на целевые маршруты раньше, чем
 * пакеты 2.x переписывают схемы инструментов, поэтому скрипт сейчас снял бы форму
 * старого тела. Полная перегенерация — шаг этапа 3.1, после волны 2.x.
 */

/** Ожидаемое решение: разрешено внутри песочницы или отклонено с названной причиной. */
export type Expectation = 'allowed-in-sandbox' | 'denied';

export interface KnownRequest {
  readonly tool: string;
  readonly method: string;
  /** Путь с подставленными сущностями песочницы. */
  readonly path: string;
  readonly body?: Record<string, unknown>;
  readonly expectation: Expectation;
}

/** Задача песочницы, зарегистрированная в журнале прогона. */
export const SANDBOX_ISSUE = 'TEST-1';
export const SANDBOX_QUEUE = 'TEST';
/** Компонент, созданный этим прогоном. */
export const SANDBOX_COMPONENT = 'component-of-this-run';
/** Локальное поле очереди, созданное этим прогоном. */
export const SANDBOX_LOCAL_FIELD = 'field-of-this-run';

/**
 * Сущности организации, допуск к которым (этап 5.1) зависит от журнала и от
 * префикса прогона в имени создаваемой сущности. Значения ниже фигурируют и в
 * теле запроса (для create — с префиксом в имени), и как записи в журнале
 * (`scope-rules.test.ts` регистрирует их в `beforeEach`).
 */
export const RUN_PREFIX = 'run-under-test';
/** Владелец прогона: единственный человек, на которого тело запроса вправе ссылаться. */
export const RUN_OWNER = 'run-owner-login';
export const DISPOSABLE_QUEUE = 'DISP';
export const SANDBOX_BOARD = '20';
export const SANDBOX_SPRINT = '30';
export const SANDBOX_GLOBAL_FIELD = 'globalField-of-this-run';
export const SANDBOX_FILTER = '40';
export const SANDBOX_ENTITY_TYPE = 'goal';
export const SANDBOX_ENTITY_ID = 'g1';

/** Очередь создаваемой доски (`0_CONTRACTS.md`, D9): не поле верхнего уровня, а фильтр. */
export const BOARD_QUEUE_FILTER = (queue: string): Record<string, unknown> => ({
  addFilter: { liveFilter: { fieldValues: { queue: [{ fixed: queue }] } } },
});

export const KNOWN_MUTATING_REQUESTS: readonly KnownRequest[] = [
  // Класс A — ключ задачи в пути (15 запросов).
  {
    tool: 'update_issue',
    method: 'patch',
    path: `/v3/issues/${SANDBOX_ISSUE}?version=1`,
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'transition_issue',
    method: 'post',
    path: `/v3/issues/${SANDBOX_ISSUE}/transitions/fixed/_execute`,
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'create_link',
    method: 'post',
    path: `/v3/issues/${SANDBOX_ISSUE}/links`,
    body: { relationship: 'relates', issue: SANDBOX_ISSUE },
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'delete_link',
    method: 'delete',
    path: `/v3/issues/${SANDBOX_ISSUE}/links/42`,
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'add_comment',
    method: 'post',
    path: `/v3/issues/${SANDBOX_ISSUE}/comments?isAddToFollowers=true`,
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'edit_comment',
    method: 'patch',
    path: `/v3/issues/${SANDBOX_ISSUE}/comments/7`,
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'delete_comment',
    method: 'delete',
    path: `/v3/issues/${SANDBOX_ISSUE}/comments/7`,
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'upload_attachment',
    method: 'post',
    path: `/v3/issues/${SANDBOX_ISSUE}/attachments`,
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'delete_attachment',
    method: 'delete',
    path: `/v3/issues/${SANDBOX_ISSUE}/attachments/9`,
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'add_checklist_item',
    method: 'post',
    path: `/v3/issues/${SANDBOX_ISSUE}/checklistItems`,
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'update_checklist_item',
    method: 'patch',
    path: `/v3/issues/${SANDBOX_ISSUE}/checklistItems/3`,
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'delete_checklist_item',
    method: 'delete',
    path: `/v3/issues/${SANDBOX_ISSUE}/checklistItems/3`,
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'add_worklog',
    method: 'post',
    path: `/v3/issues/${SANDBOX_ISSUE}/worklog`,
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'update_worklog',
    method: 'patch',
    path: `/v3/issues/${SANDBOX_ISSUE}/worklog/5`,
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'delete_worklog',
    method: 'delete',
    path: `/v3/issues/${SANDBOX_ISSUE}/worklog/5`,
    expectation: 'allowed-in-sandbox',
  },

  // Класс B — очередь в теле (1 запрос).
  {
    tool: 'create_issue',
    method: 'post',
    path: '/v3/issues',
    body: { queue: SANDBOX_QUEUE, summary: 'x' },
    expectation: 'allowed-in-sandbox',
  },

  // Класс C — bulk по явному списку ключей прогона (3 запроса).
  {
    tool: 'bulk_update_issues',
    method: 'post',
    path: '/v3/bulkchange/_update',
    body: { issues: [SANDBOX_ISSUE], values: {} },
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'bulk_transition_issues',
    method: 'post',
    path: '/v3/bulkchange/_transition',
    body: { issues: [SANDBOX_ISSUE], transition: 'close' },
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'bulk_move_issues',
    method: 'post',
    path: '/v3/bulkchange/_move',
    body: { issues: [SANDBOX_ISSUE], queue: SANDBOX_QUEUE },
    expectation: 'allowed-in-sandbox',
  },

  // Класс A' — сущности, локализованные в самой песочной очереди (5 запросов).
  {
    tool: 'create_component',
    method: 'post',
    path: '/v3/components',
    body: { name: 'component', queue: SANDBOX_QUEUE },
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'update_component',
    method: 'patch',
    path: `/v3/components/${SANDBOX_COMPONENT}`,
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'create_queue_local_field',
    method: 'post',
    path: `/v3/queues/${SANDBOX_QUEUE}/localFields`,
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'update_queue_local_field',
    method: 'patch',
    path: `/v3/queues/${SANDBOX_QUEUE}/localFields/${SANDBOX_LOCAL_FIELD}`,
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'update_queue',
    method: 'patch',
    path: `/v3/queues/${SANDBOX_QUEUE}`,
    // TEST — песочница, а не очередь, созданная этим прогоном (журнал рода
    // `queue` — только для одноразовой очереди из POST /v3/queues); остаётся отказом.
    expectation: 'denied',
  },

  // Классы D и E — сущности уровня организации, допуск по владению прогоном
  // (этап 5.1, план 5.1_org_scope_guard_sequential.md).
  {
    tool: 'create_queue',
    method: 'post',
    path: '/v3/queues/',
    body: {
      key: DISPOSABLE_QUEUE,
      name: `${RUN_PREFIX}-queue`,
      lead: RUN_OWNER,
      defaultType: 'task',
      defaultPriority: 'normal',
      issueTypesConfig: [{ issueType: 'task', workflow: 'W1', resolutions: ['fixed'] }],
    },
    expectation: 'allowed-in-sandbox',
  },
  {
    // Форма тела — та, что строит операция после переработки контракта (пакет C1
    // плана `plan_tracker_sweep7_fixes`): `{ [разрешение]: { [вид субъекта]: { [действие]: [субъекты] } } }`.
    tool: 'manage_queue_access',
    method: 'patch',
    path: `/v3/queues/${DISPOSABLE_QUEUE}/permissions`,
    body: { write: { users: { add: [RUN_OWNER] } } },
    expectation: 'allowed-in-sandbox',
  },
  {
    // Доступы боевой очереди — самая разрушительная мутация Трекера: песочная
    // очередь этим прогоном не создавалась, права на её доступы у него нет.
    tool: 'manage_queue_access (чужая очередь)',
    method: 'patch',
    path: `/v3/queues/${SANDBOX_QUEUE}/permissions`,
    body: { write: { users: { add: [RUN_OWNER] } } },
    expectation: 'denied',
  },
  {
    tool: 'create_global_field',
    method: 'post',
    path: '/v3/fields',
    body: {
      id: 'runField',
      name: { ru: `${RUN_PREFIX}-поле`, en: `${RUN_PREFIX}-field` },
      category: '000000000000000000000001',
      type: 'ru.yandex.startrek.core.fields.StringFieldType',
    },
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'update_global_field',
    method: 'patch',
    path: `/v3/fields/${SANDBOX_GLOBAL_FIELD}`,
    body: { name: `${RUN_PREFIX}-field-updated` },
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'create_entity',
    method: 'post',
    path: `/v3/entities/${SANDBOX_ENTITY_TYPE}`,
    body: { fields: { summary: `${RUN_PREFIX}-goal` } },
    expectation: 'allowed-in-sandbox',
  },
  {
    // Без префикса запись Entity API неотличима от чужой и не находится поиском.
    tool: 'create_entity (без префикса)',
    method: 'post',
    path: `/v3/entities/${SANDBOX_ENTITY_TYPE}`,
    body: { fields: { summary: 'no-prefix-goal' } },
    expectation: 'denied',
  },
  {
    tool: 'update_entity',
    method: 'patch',
    path: `/v3/entities/${SANDBOX_ENTITY_TYPE}/${SANDBOX_ENTITY_ID}?version=1`,
    // Префикс обязан пережить правку: остаток ищут поиском по имени.
    body: { fields: { summary: `${RUN_PREFIX}-goal-updated` } },
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'delete_entity',
    method: 'delete',
    path: `/v3/entities/${SANDBOX_ENTITY_TYPE}/${SANDBOX_ENTITY_ID}`,
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'add_goal_key_result',
    method: 'patch',
    path: `/v3/entities/${SANDBOX_ENTITY_TYPE}/${SANDBOX_ENTITY_ID}?fields=keyResultItems`,
    // Форма элемента — та, что строит `buildKeyResultItemBody`; `assignee` —
    // ссылка на живого человека, поэтому в теле прогона стоит владелец прогона.
    body: {
      fields: { keyResultItems: [{ type: 'binary', text: 'kr', assignee: RUN_OWNER }] },
    },
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'set_goal_key_results',
    method: 'patch',
    path: `/v3/entities/${SANDBOX_ENTITY_TYPE}/${SANDBOX_ENTITY_ID}?fields=keyResultItems`,
    body: { fields: { keyResultItems: [] } },
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'clear_goal_key_results',
    method: 'patch',
    path: `/v3/entities/${SANDBOX_ENTITY_TYPE}/${SANDBOX_ENTITY_ID}?fields=keyResultItems`,
    body: { fields: { keyResultItems: [] } },
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'create_board',
    method: 'post',
    path: '/v3/liveBoards/',
    body: {
      name: `${RUN_PREFIX}-board`,
      autoFilters: BOARD_QUEUE_FILTER(SANDBOX_QUEUE),
    },
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'update_board',
    method: 'patch',
    path: `/v3/boards/${SANDBOX_BOARD}`,
    body: { name: `${RUN_PREFIX}-board-updated` },
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'delete_board',
    method: 'delete',
    path: `/v3/boards/${SANDBOX_BOARD}`,
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'create_board_column',
    method: 'post',
    path: `/v3/boards/${SANDBOX_BOARD}/columns/`,
    body: { name: 'col', statuses: ['open'] },
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'update_board_column',
    method: 'patch',
    path: `/v3/boards/${SANDBOX_BOARD}/columns/c1`,
    body: { name: 'col-updated' },
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'delete_board_column',
    method: 'delete',
    path: `/v3/boards/${SANDBOX_BOARD}/columns/c1`,
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'create_sprint',
    method: 'post',
    path: '/v3/sprints',
    body: { name: `${RUN_PREFIX}-sprint`, board: SANDBOX_BOARD },
    expectation: 'allowed-in-sandbox',
  },
  {
    // `?version=` — обязательный query-параметр PATCH (пакет sweep7 §B, 428 без
    // него). Путь с query всё ещё обязан сопоставляться правилом спринта:
    // `canonicalRequestPath` срезает query до сравнения с regex правила.
    tool: 'update_sprint',
    method: 'patch',
    path: `/v3/sprints/${SANDBOX_SPRINT}?version=1`,
    body: { name: `${RUN_PREFIX}-sprint-updated` },
    expectation: 'allowed-in-sandbox',
  },
  {
    // Тот же query-параметр у `_start` (пакет sweep7 §B).
    tool: 'manage_sprint_lifecycle',
    method: 'post',
    path: `/v3/sprints/${SANDBOX_SPRINT}/_start?version=1`,
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'create_filter',
    method: 'post',
    path: '/v3/filters/',
    body: { name: `${RUN_PREFIX}-filter` },
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'update_filter',
    method: 'patch',
    path: `/v3/filters/${SANDBOX_FILTER}`,
    body: { name: `${RUN_PREFIX}-filter-updated` },
    expectation: 'allowed-in-sandbox',
  },
];

/**
 * Не-мутирующие POST: поиск. Запрет по методу заблокировал бы чтение,
 * поэтому у них отдельная строка в правилах и отдельная проверка в тесте.
 */
export const SEARCH_REQUESTS: readonly KnownRequest[] = [
  {
    tool: 'find_issues',
    method: 'post',
    path: '/v3/issues/_search',
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'create_issue (unique)',
    method: 'post',
    path: '/v3/issues/_findByUnique',
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'search_worklog',
    method: 'post',
    path: '/v3/worklog/_search',
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'find_entities',
    method: 'post',
    path: '/v3/entities/goal/_search?perPage=10',
    expectation: 'allowed-in-sandbox',
  },
];
