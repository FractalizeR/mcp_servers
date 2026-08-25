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

  // Класс A' — сущности, локализованные в самой песочной очереди (6 запросов).
  {
    tool: 'create_component',
    method: 'post',
    path: `/v3/queues/${SANDBOX_QUEUE}/components`,
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'update_component',
    method: 'patch',
    path: `/v3/components/${SANDBOX_COMPONENT}`,
    expectation: 'allowed-in-sandbox',
  },
  {
    tool: 'delete_component',
    method: 'delete',
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
    expectation: 'denied',
  },

  // Классы D и E — видно за пределами очереди (25 запросов).
  { tool: 'create_queue', method: 'post', path: '/v3/queues/', expectation: 'denied' },
  {
    tool: 'manage_queue_access',
    method: 'patch',
    path: `/v3/queues/${SANDBOX_QUEUE}/permissions`,
    expectation: 'denied',
  },
  { tool: 'create_project', method: 'post', path: '/v3/projects', expectation: 'denied' },
  { tool: 'update_project', method: 'patch', path: '/v3/projects/11', expectation: 'denied' },
  { tool: 'delete_project', method: 'delete', path: '/v3/projects/11', expectation: 'denied' },
  { tool: 'create_global_field', method: 'post', path: '/v3/fields', expectation: 'denied' },
  { tool: 'update_global_field', method: 'patch', path: '/v3/fields/f1', expectation: 'denied' },
  { tool: 'delete_global_field', method: 'delete', path: '/v3/fields/f1', expectation: 'denied' },
  { tool: 'create_entity', method: 'post', path: '/v3/entities/goal', expectation: 'denied' },
  {
    tool: 'update_entity',
    method: 'patch',
    path: '/v3/entities/goal/g1?version=1',
    expectation: 'denied',
  },
  { tool: 'delete_entity', method: 'delete', path: '/v3/entities/goal/g1', expectation: 'denied' },
  {
    tool: 'add_goal_key_result',
    method: 'patch',
    path: '/v3/entities/goal/g1?fields=keyResultItems',
    expectation: 'denied',
  },
  {
    tool: 'set_goal_key_results',
    method: 'patch',
    path: '/v3/entities/goal/g1?fields=keyResultItems',
    expectation: 'denied',
  },
  {
    tool: 'clear_goal_key_results',
    method: 'patch',
    path: '/v3/entities/goal/g1?fields=keyResultItems',
    expectation: 'denied',
  },
  { tool: 'create_board', method: 'post', path: '/v3/boards', expectation: 'denied' },
  { tool: 'update_board', method: 'patch', path: '/v3/boards/b1', expectation: 'denied' },
  { tool: 'delete_board', method: 'delete', path: '/v3/boards/b1', expectation: 'denied' },
  {
    tool: 'create_board_column',
    method: 'post',
    path: '/v3/boards/b1/columns/',
    expectation: 'denied',
  },
  {
    tool: 'update_board_column',
    method: 'patch',
    path: '/v3/boards/b1/columns/c1',
    expectation: 'denied',
  },
  {
    tool: 'delete_board_column',
    method: 'delete',
    path: '/v3/boards/b1/columns/c1',
    expectation: 'denied',
  },
  { tool: 'create_sprint', method: 'post', path: '/v3/sprints', expectation: 'denied' },
  { tool: 'update_sprint', method: 'patch', path: '/v3/sprints/s1', expectation: 'denied' },
  {
    tool: 'manage_sprint_lifecycle',
    method: 'post',
    path: '/v3/sprints/s1/_start',
    expectation: 'denied',
  },
  { tool: 'create_filter', method: 'post', path: '/v3/filters/', expectation: 'denied' },
  { tool: 'update_filter', method: 'patch', path: '/v3/filters/f1', expectation: 'denied' },
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
