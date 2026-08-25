/**
 * Правила сущностей уровня организации: проекты, очереди и их доступы, доски и
 * колонки, спринты, глобальные поля, записи Entity API, фильтры.
 *
 * Такая сущность видна всей организации, поэтому принадлежности очереди для неё не
 * существует вовсе: создание допускается по префиксу прогона в имени (журнал гибнет
 * вместе с процессом, и остаток ищут только поиском по имени), правка и удаление —
 * по журналу, а ссылки в теле — по владению прогоном. Обзор — `README.md`.
 */

import type { BodyViolation, ScopeDecision, ScopeRule } from './rule-matching.js';
import {
  allow,
  allowedKeysViolation,
  asRecord,
  bothViolations,
  deny,
  hasRunPrefix,
  isRecord,
  nameKeepsPrefix,
  nestedValue,
  ownershipRule,
  orgFamilyRules,
  queueRefWithinScope,
  queueWithinScope,
  refOf,
  requireRunPrefix,
} from './rule-matching.js';
import { personViolation } from './people-in-body.js';

/**
 * Состав тела каждого семейства — белый список ключей верхнего уровня.
 *
 * Снят по DTO и операциям, которые эти тела и собирают (`src/tracker_api/dto/**`,
 * `src/tracker_api/api_operations/**`), а не по памяти ревьюера: полнота чёрного
 * списка опасных полей трижды подряд оказывалась мнимой. Ключ, которого здесь нет,
 * — отказ с его именем. На задачи белый список не распространяется осознанно: у
 * задачи Трекера произвольные пользовательские поля, там работает только проверка
 * ссылок на людей.
 */
const PROJECT_KEYS = [
  'name',
  'lead',
  'status',
  'description',
  'startDate',
  'endDate',
  'queues',
  'teamUserIds',
] as const;
/** `POST /v3/projects` не знает ни `key`, ни `queueIds`, ни `teamUserIds` (0_CONTRACTS.md, D8). */
const PROJECT_CREATE_KEYS = [
  'name',
  'queues',
  'description',
  'lead',
  'status',
  'startDate',
  'endDate',
] as const;
const QUEUE_KEYS = [
  'key',
  'name',
  'lead',
  'defaultType',
  'defaultPriority',
  'description',
  'issueTypesConfig',
] as const;
const BOARD_KEYS = [
  'name',
  'queue',
  'columns',
  'filter',
  'orderBy',
  'orderAsc',
  'query',
  'useRanking',
  'country',
  'version',
] as const;
/** `POST /v3/liveBoards` (0_CONTRACTS.md, D9): очередь — внутри `autoFilters`. */
const BOARD_CREATE_KEYS = [
  'name',
  'owner',
  'boardPermissionsTemplate',
  'backlogAvailable',
  'sprintsAvailable',
  'columns',
  'backlogColumns',
  'nonParametrizedColumns',
  'autoFilters',
] as const;
const BOARD_COLUMN_KEYS = ['name', 'statuses', 'limit'] as const;
const SPRINT_KEYS = [
  'name',
  'board',
  'startDate',
  'endDate',
  'startDateTime',
  'endDateTime',
  'status',
  'version',
  'archived',
] as const;
const GLOBAL_FIELD_KEYS = [
  'name',
  'description',
  'schema',
  'readonly',
  'options',
  'suggest',
  'optionsProvider',
] as const;
/**
 * `POST /v3/fields` (0_CONTRACTS.md, D10). `schema` в запросе не существует — оно
 * приходит только в ответе; набор значений задаётся `optionsProvider`, а не
 * `options`/`suggest`.
 */
const GLOBAL_FIELD_CREATE_KEYS = [
  'id',
  'name',
  'description',
  'category',
  'type',
  'order',
  'readonly',
  'visible',
  'hidden',
  'container',
  'optionsProvider',
] as const;
const FILTER_KEYS = ['name', 'filter', 'query', 'sorts', 'fields', 'groupBy'] as const;
/** Тело записи Entity API — только `{ fields }`; состав самих `fields` — ниже. */
const ENTITY_KEYS = ['fields'] as const;
/**
 * Ключи внутри `fields` записи Entity API. `extraFields` инструмента объявлен
 * `z.record(z.unknown())` — состав тела не ограничен ничем, поэтому ограничение
 * ставит рубеж: незнакомое поле записи может оказаться ссылкой на живого человека
 * или на чужую сущность (`teamAccess`, `parentEntity`, `responsible`).
 */
const ENTITY_FIELD_KEYS = [
  'summary',
  'keyResultItems',
  'deadline',
  'start',
  'end',
  'weight',
] as const;

/** Роли и действия правки доступов очереди — из схемы `manage_queue_access`. */
const QUEUE_ACCESS_ROLES: ReadonlySet<string> = new Set([
  'queue-lead',
  'team-member',
  'follower',
  'access',
]);
const QUEUE_ACCESS_ACTIONS: ReadonlySet<string> = new Set(['add', 'remove']);

/** `lead` — обязательное поле схем создания проекта и очереди: живой руководитель. */
const leadViolation: BodyViolation = (body, context) =>
  personViolation('lead', body?.['lead'], context);

/** Создание знает очередь как `queues` — одной ссылкой строкой, а не массивом. */
const projectCreateViolation: BodyViolation = (body, context) =>
  queueRefWithinScope(body?.['queues'], context)
    ? undefined
    : 'проект создаётся в очереди за пределами прогона либо без неё (queues)';

/**
 * `queues` — только очередь прогона, `teamUserIds` — пусто.
 *
 * Правка знает очередь как `queues` (ключ строкой), а не `queueIds`: живая проба
 * 2026-08-25 показала `400 queueIds: Incorrect data format`.
 */
const projectEditViolation: BodyViolation = (body, context) => {
  const queues = body?.['queues'];
  if (queues !== undefined && !queueRefWithinScope(queues, context)) {
    return 'проект ссылается на очередь за пределами прогона (queues)';
  }
  const team = body?.['teamUserIds'];
  return team !== undefined && (!Array.isArray(team) || team.length > 0)
    ? 'проект назначает участников команды — это меняет живых людей организации (teamUserIds)'
    : undefined;
};

const BOARD_QUEUE_PATH = ['addFilter', 'liveFilter', 'fieldValues', 'queue'] as const;

/**
 * Очередь создаваемой доски лежит внутри `autoFilters` элементами `{ fixed: 'TEST' }`.
 * `autoFilters` нет вовсе — доска заводится без привязки к очереди, это законно;
 * `autoFilters` есть, а очередь из него не читается — отказ: форма разошлась с той,
 * под которую написана проверка, и доска могла бы уехать в чужую очередь молча.
 */
const boardCreateViolation: BodyViolation = (body, context) => {
  const autoFilters = body?.['autoFilters'];
  if (autoFilters === undefined) return undefined;
  const refs = nestedValue(autoFilters, BOARD_QUEUE_PATH);
  if (!Array.isArray(refs) || refs.length === 0) {
    return `доска: очередь не распознана в autoFilters.${BOARD_QUEUE_PATH.join('.')}`;
  }
  return refs.every((entry) => queueWithinScope(refOf(entry, 'fixed'), context))
    ? undefined
    : 'доска привязана к очереди за пределами прогона (autoFilters)';
};

const boardEditViolation: BodyViolation = (body, context) => {
  const queue = body?.['queue'];
  return queue !== undefined && !queueRefWithinScope(queue, context)
    ? 'доска привязана к очереди за пределами прогона (queue)'
    : undefined;
};

/** Спринт живёт на доске: перевешенный на чужую, он меняет состав ЧУЖОЙ доски. */
const sprintBodyViolation: BodyViolation = (body, context) => {
  const board = body?.['board'];
  if (board === undefined) return undefined;
  const boardRef = refOf(board, 'id');
  return boardRef === undefined || !context.journal.has('board', boardRef)
    ? `спринт ссылается на доску ${boardRef ?? '<не распознана>'}, не принадлежащую этому прогону`
    : undefined;
};

const sprintCreateViolation: BodyViolation = (body) =>
  body?.['board'] === undefined
    ? 'спринт создаётся без ссылки на доску (board) — родитель не распознан'
    : undefined;

/**
 * Тело правки доступов: `{ [роль]: { [действие]: [люди] } }`
 * (`manage-queue-access.operation.ts`). Каждый субъект — реальный логин, поэтому
 * список проверяется поимённо; нераспознанная форма — отказ.
 */
const queueAccessViolation: BodyViolation = (body, context) => {
  if (body === undefined || Object.keys(body).length === 0) {
    return 'тело правки доступов очереди не распознано';
  }
  for (const [role, roleValue] of Object.entries(body)) {
    if (!QUEUE_ACCESS_ROLES.has(role)) {
      return `доступы очереди: роль ${role} рубежу неизвестна`;
    }
    if (!isRecord(roleValue) || Object.keys(roleValue).length === 0) {
      return `доступы очереди: форма роли ${role} не распознана`;
    }
    for (const [action, subjects] of Object.entries(roleValue)) {
      if (!QUEUE_ACCESS_ACTIONS.has(action)) {
        return `доступы очереди: действие ${action} рубежу неизвестно`;
      }
      const problem = personViolation(`доступы очереди (${role}/${action})`, subjects, context);
      if (problem !== undefined) return problem;
    }
  }
  return undefined;
};

/**
 * Тело записи Entity API: `{ fields: {...} }` и ничего больше, а состав `fields` —
 * по белому списку. Единственное семейство, чьё тело инструмент не ограничивает
 * вовсе, — значит, ограничение обязан поставить рубеж.
 */
const entityBodyViolation: BodyViolation = (body) => {
  const fields = body?.['fields'];
  if (fields === undefined) return undefined;
  if (!isRecord(fields)) return 'запись Entity API: поле fields не распознано как объект';
  return allowedKeysViolation('запись Entity API (fields)', ENTITY_FIELD_KEYS)(fields);
};

/**
 * Создание очереди: своё правило, а не семейство. Ключ известен заранее и обязан
 * совпасть с объявленной одноразовой очередью, а отсутствие переменной называется
 * раньше префикса — иначе отказ говорил бы не о той причине.
 */
const QUEUE_CREATE_RULE: ScopeRule = {
  pattern: /^\/v3\/queues\/?$/,
  methods: ['post'],
  decide: (_match, request, context): ScopeDecision => {
    if (context.disposableQueue === undefined) {
      return deny(
        'создание очереди требует одноразовой очереди прогона: задайте переменную ' +
          'YANDEX_TRACKER_LIVE_SCOPE_DISPOSABLE_QUEUE'
      );
    }
    const body = asRecord(request.data);
    const key = body?.['key'];
    if (key !== context.disposableQueue) {
      return deny(
        `ключ очереди ${typeof key === 'string' ? key : '<не распознан>'} не совпадает с ` +
          `одноразовой очередью прогона ${context.disposableQueue}`
      );
    }
    const prefixCheck = requireRunPrefix(context);
    if (!prefixCheck.ok) return prefixCheck.decision;
    if (!hasRunPrefix(body?.['name'], prefixCheck.prefix)) {
      return deny(`имя очереди не содержит префикс прогона ${prefixCheck.prefix}`);
    }
    const problem =
      allowedKeysViolation('очередь', QUEUE_KEYS)(body) ?? leadViolation(body, context);
    return problem !== undefined
      ? deny(problem)
      : allow(`создание одноразовой очереди прогона ${context.disposableQueue}`);
  },
};

/**
 * Порядок: частное правило выше общего, первое совпавшее решает. Все правила
 * заякорены — незаякоренное правило-родитель выдавало бы право на любой подпуть, и
 * новый инструмент проезжал бы мимо fail-closed молча.
 */
export const ORGANIZATION_RULES: readonly ScopeRule[] = [
  QUEUE_CREATE_RULE,
  ownershipRule(/^\/v3\/queues\/([^/?]+)\/permissions\/?$/, 'any', 'queue', 'доступы очереди', {
    violation: queueAccessViolation,
  }),
  ownershipRule(/^\/v3\/queues\/([^/?]+)\/?$/, 'any', 'queue', 'очередь', {
    violation: bothViolations(
      bothViolations(allowedKeysViolation('очередь', QUEUE_KEYS), leadViolation),
      nameKeepsPrefix('очередь', (body) => body?.['name'], 'имя')
    ),
  }),
  ...orgFamilyRules({
    label: 'проект',
    kind: 'project',
    createPattern: /^\/v3\/projects\/?$/,
    editPattern: /^\/v3\/projects\/([^/?]+)\/?$/,
    bodyViolation: leadViolation,
    createViolation: projectCreateViolation,
    editViolation: projectEditViolation,
    allowedKeys: PROJECT_KEYS,
    createAllowedKeys: PROJECT_CREATE_KEYS,
  }),
  ...orgFamilyRules({
    label: 'глобальное поле',
    kind: 'globalField',
    createPattern: /^\/v3\/fields\/?$/,
    editPattern: /^\/v3\/fields\/([^/?]+)\/?$/,
    allowedKeys: GLOBAL_FIELD_KEYS,
    createAllowedKeys: GLOBAL_FIELD_CREATE_KEYS,
  }),
  // name/description в Entity API не существуют — только fields.summary (create-entity.schema.ts).
  // Тип записи перечислен в самом правиле: полагаться на то, что Zod-схема
  // инструмента не пришлёт четвёртый тип, значит держать fail-closed на чужой
  // аккуратности.
  ...orgFamilyRules({
    label: 'запись Entity API',
    kind: 'entity',
    createPattern: /^\/v3\/entities\/(goal|project|portfolio)\/?$/,
    editPattern: /^\/v3\/entities\/(goal|project|portfolio)\/([^/?]+)\/?$/,
    editMethods: ['patch', 'delete'],
    nameOf: (body) => asRecord(body?.['fields'])?.['summary'],
    fieldLabel: 'fields.summary',
    idOf: (match) => `${match[1] ?? ''}/${match[2] ?? ''}`,
    bodyViolation: entityBodyViolation,
    allowedKeys: ENTITY_KEYS,
  }),
  // Колонка не адресуется вне своей доски, поэтому право на неё даёт запись о доске:
  // паттерн покрывает и создание (POST .../columns), и правку (PATCH/DELETE .../columns/{id}).
  // Префикс с имени колонки не спрашивается: колонка не создаётся с ним и вне
  // своей доски не ищется — доску убирают целиком.
  ownershipRule(
    /^\/v3\/boards\/([^/?]+)\/columns(\/[^/?]+)?\/?$/,
    'any',
    'board',
    'колонка доски',
    {
      violation: allowedKeysViolation('колонка доски', BOARD_COLUMN_KEYS),
    }
  ),
  // Создание и правка доски разъехались по маршрутам: `POST /v3/boards` объявлен
  // устаревшим и молча игнорирует тело, поэтому правилом не покрыт и уходит в
  // fail-closed — отказ честнее беззвучно созданной доски с параметрами по умолчанию.
  ...orgFamilyRules({
    label: 'доска',
    kind: 'board',
    createPattern: /^\/v3\/liveBoards\/?$/,
    editPattern: /^\/v3\/boards\/([^/?]+)\/?$/,
    createViolation: boardCreateViolation,
    editViolation: boardEditViolation,
    allowedKeys: BOARD_KEYS,
    createAllowedKeys: BOARD_CREATE_KEYS,
  }),
  ...orgFamilyRules({
    label: 'спринт',
    kind: 'sprint',
    createPattern: /^\/v3\/sprints\/?$/,
    // `_start`/`_archive` решаются так же, как правка: право даёт журнал.
    editPattern: /^\/v3\/sprints\/([^/?]+)(?:\/(?:_start|_archive))?\/?$/,
    editMethods: ['patch', 'delete', 'post'],
    bodyViolation: sprintBodyViolation,
    createViolation: sprintCreateViolation,
    allowedKeys: SPRINT_KEYS,
  }),
  ...orgFamilyRules({
    label: 'фильтр',
    kind: 'filter',
    createPattern: /^\/v3\/filters\/?$/,
    editPattern: /^\/v3\/filters\/([^/?]+)\/?$/,
    allowedKeys: FILTER_KEYS,
  }),
];
