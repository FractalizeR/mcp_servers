/**
 * Правила песочной очереди: сущности, локализованные в очереди и за её пределами
 * не видные, — задачи прогона и всё вложенное в них, массовые операции, компоненты
 * и локальные поля очереди.
 *
 * Задачи привязаны к песочной очереди буквально (ключ `TEST-N`), а компоненты и
 * локальные поля — к любой очереди области прогона: и к песочной, и к одноразовой,
 * которую прогон создал сам. Отсюда `queueWithinScope` вместо сравнения с одной
 * константой.
 *
 * Принадлежности очереди мало: очередь общая, в ней лежат чужие задачи и задачи
 * прошлых прогонов, поэтому право даёт журнал прогона. Обзор — `README.md`.
 */

import type { OutgoingRequest } from '@fractalizer/mcp-infrastructure';
import type { Body, ScopeContext, ScopeDecision, ScopeRule } from './rule-matching.js';
import {
  allow,
  allowedKeysViolation,
  asRecord,
  deny,
  isRecord,
  issueKeyOf,
  queueKeyOf,
  queueWithinScope,
} from './rule-matching.js';
import {
  BULK_MOVE_VALUES_KEYS,
  BULK_TRANSITION_VALUES_KEYS,
  BULK_UPDATE_VALUES_KEYS,
  ISSUE_CREATE_KEYS,
  ISSUE_UPDATE_KEYS,
  TRANSITION_EXECUTE_KEYS,
  customFieldsViolation,
} from './custom-fields-in-body.js';

/** 24-hex идентификатор задачи — по нему принадлежность решает только журнал. */
const OPAQUE_ISSUE_ID = /^[0-9a-f]{24}$/;

/** Тело `POST /v3/components` (0_CONTRACTS.md, D1). */
const COMPONENT_CREATE_KEYS = ['name', 'queue', 'description', 'lead', 'assignAuto'] as const;

/** Задача принадлежит песочнице И создана этим прогоном: `TEST` общая. */
function decideIssueScope(reference: string, context: ScopeContext): ScopeDecision {
  const belongsToSandbox = reference.startsWith(`${context.sandboxQueue}-`);
  if (!OPAQUE_ISSUE_ID.test(reference) && !belongsToSandbox) {
    return deny(`задача ${reference} вне песочной очереди ${context.sandboxQueue}`);
  }
  if (!context.journal.has('issue', reference)) {
    return deny(
      `задача ${reference} не создана этим прогоном: очередь ${context.sandboxQueue} общая, ` +
        `в ней лежат чужие задачи и задачи прошлых прогонов`
    );
  }
  return allow(`задача ${reference} создана этим прогоном`);
}

/** Связь двусторонняя: второй конец вне песочницы — чужая задача меняется через `TEST`. */
function decideLinkCounterpart(request: OutgoingRequest, context: ScopeContext): ScopeDecision {
  const counterpart = issueKeyOf(asRecord(request.data)?.['issue']);
  if (counterpart === undefined) {
    return deny('в теле связи не распознан второй конец (поле issue)');
  }
  return decideIssueScope(counterpart, context);
}

const issueCreateFields = customFieldsViolation('создание задачи', ISSUE_CREATE_KEYS);
const issueUpdateFields = customFieldsViolation('правка задачи', ISSUE_UPDATE_KEYS);
const transitionFields = customFieldsViolation('переход задачи', TRANSITION_EXECUTE_KEYS);
/** Своё тело `values` у каждого рода массовой операции: перечни ключей разные. */
const BULK_VALUES_FIELDS: Readonly<Record<string, ReturnType<typeof customFieldsViolation>>> = {
  update: customFieldsViolation('массовое обновление (values)', BULK_UPDATE_VALUES_KEYS),
  move: customFieldsViolation('массовый перенос (values)', BULK_MOVE_VALUES_KEYS),
  transition: customFieldsViolation('массовый переход (values)', BULK_TRANSITION_VALUES_KEYS),
};

/**
 * Тело самой задачи и её перехода: у обоих произвольные пользовательские поля,
 * поэтому состав ключей проверяется, а вложенные ресурсы (комментарии, worklog,
 * связи) пользовательских полей не несут и своим DTO закрыты.
 */
function issueBodyViolation(
  nested: string | undefined,
  request: OutgoingRequest,
  context: ScopeContext
): string | undefined {
  const body = asRecord(request.data);
  if (nested === undefined) return issueUpdateFields(body, context);
  return nested === 'transitions' ? transitionFields(body, context) : undefined;
}

/** `values` массовой операции — объект пользовательских полей либо его нет вовсе. */
function bulkValuesViolation(kind: string, body: Body, context: ScopeContext): string | undefined {
  const values = body?.['values'];
  if (values === undefined) return undefined;
  if (!isRecord(values)) return 'массовая операция: поле values не распознано как объект';
  const check = BULK_VALUES_FIELDS[kind];
  return check === undefined
    ? `массовая операция ${kind} рубежу неизвестна`
    : check(values, context);
}

/** POST, но не мутация: find_issues, search_worklog, find_entities и т.п. */
const SEARCH_ENDPOINTS: readonly RegExp[] = [
  /^\/v3\/issues\/_search$/,
  /^\/v3\/issues\/_findByUnique$/,
  /^\/v3\/worklog\/_search$/,
  /^\/v3\/entities\/[^/]+\/_search$/,
];
const SEARCH_RULES: readonly ScopeRule[] = SEARCH_ENDPOINTS.map((pattern) => ({
  pattern,
  methods: ['post'] as const,
  readsOnly: true,
  decide: () => allow('поисковый endpoint, мутации нет'),
}));

/**
 * Вложенные ресурсы задачи, известные рубежу. Перечень, а не открытый хвост:
 * незаякоренное правило-родитель выдавало бы право на любой подпуть своей задачи,
 * и новый вложенный эндпоинт, меняющий что-то за пределами задачи, проехал бы мимо
 * fail-closed молча — как `POST .../links`, который меняет ЧУЖУЮ задачу телом.
 */
const ISSUE_SUBRESOURCES: ReadonlySet<string> = new Set([
  'comments',
  'attachments',
  'checklistItems',
  'worklog',
  'links',
  'transitions',
]);

/** Версия в пути: правила этапа 5.1 — только `/v3/`, переходные — `/v[23]/`. */
export const SANDBOX_QUEUE_RULES: readonly ScopeRule[] = [
  ...SEARCH_RULES,

  // B: создание задачи — очередь названа только в теле.
  {
    pattern: /^\/v3\/issues\/?$/,
    methods: ['post'],
    decide: (_match, request, context): ScopeDecision => {
      const body = asRecord(request.data);
      const queue = queueKeyOf(body?.['queue']);
      if (queue === undefined) return deny('в теле создания задачи не распознана очередь');
      if (queue !== context.sandboxQueue) {
        return deny(`создание задачи в очереди ${queue} вне песочницы ${context.sandboxQueue}`);
      }
      const problem = issueCreateFields(body, context);
      return problem === undefined
        ? allow(`создание задачи в песочной очереди ${queue}`)
        : deny(problem);
    },
  },

  // A: задача песочницы и всё вложенное в неё — комментарии, чек-листы, вложения, worklog, связи.
  // Правило заякорено: хвост вложенного ресурса (`/comments/7`,
  // `/transitions/fixed/_execute`) разрешён, а сам ресурс обязан быть известным.
  {
    pattern:
      /^\/v[23]\/issues\/([A-Z][A-Z0-9]*-\d+|[0-9a-f]{24})(?:\/(?<nested>[^/?]+)(?:\/[^?]*)?)?$/,
    methods: 'any',
    decide: (match, request, context): ScopeDecision => {
      const issueDecision = decideIssueScope(match[1] ?? '', context);
      if (!issueDecision.allowed) return issueDecision;
      const nested = match.groups?.['nested'];
      if (nested !== undefined && !ISSUE_SUBRESOURCES.has(nested)) {
        return deny(`вложенный ресурс задачи ${nested} рубежу неизвестен`);
      }
      // Удаление связи проверяется только по своей стороне — оно обратимо.
      if (nested === 'links' && request.method === 'post') {
        return decideLinkCounterpart(request, context);
      }
      const problem = issueBodyViolation(nested, request, context);
      return problem === undefined ? issueDecision : deny(problem);
    },
  },

  // C: массовые операции — только по явному списку ключей этого прогона.
  {
    pattern: /^\/v[23]\/bulkchange\/_(?<kind>update|transition|move)$/,
    methods: ['post'],
    decide: (match, request, context): ScopeDecision => {
      const body = asRecord(request.data);
      const issues = body?.['issues'];
      if (!Array.isArray(issues) || issues.length === 0) {
        return deny(
          'массовая операция без явного списка ключей: запрос вида «все задачи очереди» ' +
            'в общей организации необратим'
        );
      }
      for (const raw of issues) {
        const key = issueKeyOf(raw);
        if (key === undefined) return deny('в списке массовой операции нераспознанный элемент');
        const decision = decideIssueScope(key, context);
        if (!decision.allowed) return decision;
      }
      const kind = match.groups?.['kind'] ?? '';
      if (kind === 'move') {
        const target = queueKeyOf(body?.['queue']);
        if (!queueWithinScope(target, context)) {
          return deny(
            `перенос задач в очередь ${target ?? '<не распознана>'} выносит их из песочницы ` +
              'и одноразовой очереди этого прогона'
          );
        }
      }
      const problem = bulkValuesViolation(kind, body, context);
      return problem === undefined
        ? allow(`массовая операция по ${issues.length} задачам этого прогона`)
        : deny(problem);
    },
  },

  // A': компоненты очереди — сущность самой очереди, за её пределами не видна.
  // Очередь области прогона — песочная ИЛИ одноразовая, созданная прогоном:
  // сравнение с одной константой отказывало заводить компонент в очереди, которую
  // прогон сам же и создал (ревью 2026-08-25).
  //
  // Маршрута `POST /v3/queues/{q}/components` в API нет (0_CONTRACTS.md, D1):
  // очередь называет тело, и нераспознанная очередь — отказ, как у создания задачи.
  {
    pattern: /^\/v3\/components\/?$/,
    methods: ['post'],
    decide: (_match, request, context): ScopeDecision => {
      const body = asRecord(request.data);
      const problem = allowedKeysViolation('компонент', COMPONENT_CREATE_KEYS)(body);
      if (problem !== undefined) return deny(problem);
      const queue = queueKeyOf(body?.['queue']);
      if (queue === undefined) return deny('в теле создания компонента не распознана очередь');
      return queueWithinScope(queue, context)
        ? allow(`компонент внутри очереди области прогона ${queue}`)
        : deny(`компонент в очереди ${queue} вне области прогона`);
    },
  },
  {
    pattern: /^\/v[23]\/components\/([^/?]+)\/?$/,
    methods: 'any',
    decide: (match, _request, context) =>
      context.journal.has('component', match[1] ?? '')
        ? allow('компонент создан этим прогоном')
        : deny(
            `компонент ${match[1] ?? '?'} не создан этим прогоном: по идентификатору ` +
              'принадлежность к очереди не восстанавливается'
          ),
  },

  // A': локальные поля очереди — создание по очереди, правка/удаление по журналу (поле могли завести не мы).
  {
    pattern: /^\/v3\/queues\/([^/?]+)\/localFields\/?$/,
    methods: ['post'],
    decide: (match, _request, context): ScopeDecision =>
      queueWithinScope(match[1], context)
        ? allow(`создание локального поля в очереди области прогона ${match[1] ?? '?'}`)
        : deny(`локальное поле очереди ${match[1] ?? '?'} вне области прогона`),
  },
  {
    pattern: /^\/v3\/queues\/([^/?]+)\/localFields\/([^/?]+)\/?$/,
    methods: 'any',
    decide: (match, _request, context): ScopeDecision => {
      if (!queueWithinScope(match[1], context)) {
        return deny(`локальное поле очереди ${match[1] ?? '?'} вне области прогона`);
      }
      const field = match[2] ?? '';
      return context.journal.has('queueLocalField', field)
        ? allow('локальное поле создано этим прогоном')
        : deny(`локальное поле ${field} не создано этим прогоном`);
    },
  },
];
