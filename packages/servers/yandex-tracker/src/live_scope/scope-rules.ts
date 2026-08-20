/**
 * Правила области действия живого прогона — таблица, а не разбросанные проверки.
 *
 * Основание таблицы — машинное перечисление исходящих запросов всех 92 инструментов
 * (`scripts/enumerate-outgoing-requests.ts`): 50 не-GET запросов, у которых область
 * действия определяется пятью разными способами. Правило допуска одно:
 * **сущность локализована в песочной очереди и не видна за её пределами.**
 * Всё, что видно организации целиком (очереди, проекты, глобальные поля, цели,
 * доски, спринты, фильтры), живьём не проверяется — для них остаётся моковый уровень.
 *
 * Порядок важен: правила проверяются сверху вниз, первое совпавшее решает.
 * Не совпало ни одно — отказ (см. `decideRequest`): умолчание «пропустить, раз
 * не поняли» превратило бы рубеж в декорацию.
 */

import type { OutgoingRequest } from '@fractalizer/mcp-infrastructure';
import type { RunJournal } from './run-journal.js';

export interface ScopeDecision {
  readonly allowed: boolean;
  /** Почему решение такое — попадает в текст ошибки живого прогона. */
  readonly reason: string;
}

export interface ScopeContext {
  /** Ключ песочной очереди, например `TEST`. */
  readonly sandboxQueue: string;
  readonly journal: RunJournal;

  /**
   * Заполнена, если рубеж обязан отклонять любую мутацию независимо от правил:
   * пишущий прогон, не объявивший область действия. Текст объясняет, что сделать.
   */
  readonly refuseEverything?: string;
}

interface ScopeRule {
  readonly pattern: RegExp;
  /** Методы в нижнем регистре, к которым правило применимо; `any` — любые. */
  readonly methods: readonly string[] | 'any';
  readonly decide: (
    match: RegExpExecArray,
    request: OutgoingRequest,
    context: ScopeContext
  ) => ScopeDecision;
}

const allow = (reason: string): ScopeDecision => ({ allowed: true, reason });
const deny = (reason: string): ScopeDecision => ({ allowed: false, reason });

/** Тело запроса как объект; FormData и строки объектом не считаются. */
function asRecord(data: unknown): Record<string, unknown> | undefined {
  if (typeof data === 'string') {
    try {
      const parsed: unknown = JSON.parse(data);
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : undefined;
    } catch {
      return undefined;
    }
  }
  return typeof data === 'object' && data !== null && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : undefined;
}

/** Ключ очереди в ссылке на сущность: строкой (`TEST`) либо объектом (`{ key: 'TEST' }`). */
function queueKeyOf(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const key = (value as { key?: unknown; id?: unknown }).key;
    if (typeof key === 'string') return key;
  }
  return undefined;
}

/**
 * Задачу адресуют двояко: ключом (`TEST-1`) и 24-символьным hex-идентификатором.
 * По идентификатору очередь не восстанавливается — принадлежность решает только
 * журнал. Не понимать эту форму нельзя: защита обходилась бы сменой формы записи.
 */
const OPAQUE_ISSUE_ID = /^[0-9a-f]{24}$/;

function isOpaqueIssueId(reference: string): boolean {
  return OPAQUE_ISSUE_ID.test(reference);
}

function issueBelongsToSandbox(issueKey: string, sandboxQueue: string): boolean {
  return issueKey.startsWith(`${sandboxQueue}-`);
}

/** Ключ задачи в ссылке: строкой (`TEST-1`) либо объектом (`{ key: 'TEST-1' }`). */
function issueKeyOf(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const key = (value as { key?: unknown }).key;
    if (typeof key === 'string') return key;
  }
  return undefined;
}

/**
 * Задача принадлежит песочнице И создана этим прогоном.
 *
 * Одной принадлежности очереди мало: очередь `TEST` — общая, в ней лежат чужие
 * задачи и задачи прошлых прогонов.
 */
function decideIssueScope(reference: string, context: ScopeContext): ScopeDecision {
  if (!isOpaqueIssueId(reference) && !issueBelongsToSandbox(reference, context.sandboxQueue)) {
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

/**
 * Связь двусторонняя: она появляется и в задаче на другом конце. Если тот конец
 * вне песочницы, запрос меняет чужую задачу, оставаясь по пути внутри `TEST`.
 */
function decideLinkCounterpart(request: OutgoingRequest, context: ScopeContext): ScopeDecision {
  const body = asRecord(request.data);
  const counterpart = issueKeyOf(body?.['issue']);
  if (counterpart === undefined) {
    return deny('в теле связи не распознан второй конец (поле issue)');
  }
  return decideIssueScope(counterpart, context);
}

/**
 * Поиск отправляется методом POST, но ничего не меняет: запрет по методу
 * заблокировал бы чтение — find_issues, search_worklog, find_entities.
 */
const SEARCH_ENDPOINTS: readonly RegExp[] = [
  /^\/v3\/issues\/_search$/,
  /^\/v3\/issues\/_findByUnique$/,
  /^\/v3\/worklog\/_search$/,
  /^\/v3\/entities\/[^/]+\/_search$/,
];

const SEARCH_RULES: readonly ScopeRule[] = SEARCH_ENDPOINTS.map((pattern) => ({
  pattern,
  methods: ['post'] as const,
  decide: () => allow('поисковый endpoint, мутации нет'),
}));

export const SCOPE_RULES: readonly ScopeRule[] = [
  ...SEARCH_RULES,

  // B: создание задачи — очередь названа только в теле.
  {
    pattern: /^\/v3\/issues\/?$/,
    methods: ['post'],
    decide: (_match, request, context): ScopeDecision => {
      const queue = queueKeyOf(asRecord(request.data)?.['queue']);
      if (queue === undefined) return deny('в теле создания задачи не распознана очередь');
      return queue === context.sandboxQueue
        ? allow(`создание задачи в песочной очереди ${queue}`)
        : deny(`создание задачи в очереди ${queue} вне песочницы ${context.sandboxQueue}`);
    },
  },

  // A: задача песочницы и всё вложенное в неё — комментарии, чек-листы,
  // вложения, worklog, переходы, связи.
  {
    pattern: /^\/v[23]\/issues\/([A-Z][A-Z0-9]*-\d+|[0-9a-f]{24})(?=\/|$)(\/(?<nested>[^/?]+))?/,
    methods: 'any',
    decide: (match, request, context): ScopeDecision => {
      const issueDecision = decideIssueScope(match[1] ?? '', context);
      if (!issueDecision.allowed) return issueDecision;
      const nested = match.groups?.['nested'];
      if (nested === 'links' && request.method === 'post') {
        return decideLinkCounterpart(request, context);
      }
      // Удаление связи (DELETE .../links/{id}) проверяется только по своей стороне:
      // второй конец в запросе не назван. Осознанно — удаление обратимо и не меняет
      // содержимого чужой задачи, в отличие от создания связи.
      return issueDecision;
    },
  },

  // C: массовые операции — только по явному списку ключей этого прогона.
  {
    pattern: /^\/v2\/bulkchange\/_(?<kind>update|transition|move)$/,
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
      if (match.groups?.['kind'] === 'move') {
        const target = queueKeyOf(body?.['queue']);
        if (target !== context.sandboxQueue) {
          return deny(
            `перенос задач в очередь ${target ?? '<не распознана>'} выносит их из песочницы`
          );
        }
      }
      return allow(`массовая операция по ${issues.length} задачам этого прогона`);
    },
  },

  // A': компоненты очереди — сущность самой очереди, за её пределами не видна.
  {
    pattern: /^\/v2\/queues\/([^/?]+)\/components\/?$/,
    methods: ['post'],
    decide: (match, _request, context) =>
      match[1] === context.sandboxQueue
        ? allow(`компонент внутри песочной очереди ${context.sandboxQueue}`)
        : deny(`компонент в очереди ${match[1] ?? '?'} вне песочницы`),
  },
  {
    pattern: /^\/v2\/components\/([^/?]+)/,
    methods: 'any',
    decide: (match, _request, context) =>
      context.journal.has('component', match[1] ?? '')
        ? allow('компонент создан этим прогоном')
        : deny(
            `компонент ${match[1] ?? '?'} не создан этим прогоном: по идентификатору ` +
              'принадлежность к очереди не восстанавливается'
          ),
  },

  // A': локальные поля очереди. Создание ограничено очередью, а правка и удаление
  // существующего — журналом: очередь `TEST` общая, и её поля мог завести кто-то
  // другой. Поймано ревью: правило по одному имени очереди позволяло испортить
  // чужое поле песочницы.
  {
    pattern: /^\/v3\/queues\/([^/?]+)\/localFields\/?$/,
    methods: ['post'],
    decide: (match, _request, context): ScopeDecision =>
      match[1] === context.sandboxQueue
        ? allow(`создание локального поля в песочной очереди ${context.sandboxQueue}`)
        : deny(`локальное поле очереди ${match[1] ?? '?'} вне песочницы`),
  },
  {
    pattern: /^\/v3\/queues\/([^/?]+)\/localFields\/([^/?]+)/,
    methods: 'any',
    decide: (match, _request, context): ScopeDecision => {
      if (match[1] !== context.sandboxQueue) {
        return deny(`локальное поле очереди ${match[1] ?? '?'} вне песочницы`);
      }
      const field = match[2] ?? '';
      return context.journal.has('queueLocalField', field)
        ? allow('локальное поле создано этим прогоном')
        : deny(`локальное поле ${field} не создано этим прогоном`);
    },
  },

  // E и D: всё, что видно за пределами очереди. Отдельными строками — чтобы
  // отказ называл причину, а не «правило не найдено».
  {
    pattern: /^\/v3\/queues(\/[^/?]*)?\/?$/,
    methods: 'any',
    decide: () => deny('создание и правка очередей меняют организацию, а не песочницу'),
  },
  {
    pattern: /^\/v3\/queues\/[^/?]+\/permissions/,
    methods: 'any',
    decide: () => deny('доступы очереди определяют, кто её видит, — эффект вне песочницы'),
  },
  {
    pattern: /^\/v2\/projects/,
    methods: 'any',
    decide: () => deny('проекты принадлежат организации целиком'),
  },
  {
    pattern: /^\/v2\/fields/,
    methods: 'any',
    decide: () => deny('глобальные поля действуют во всех очередях организации'),
  },
  {
    pattern: /^\/v3\/entities/,
    methods: 'any',
    decide: () => deny('цели и сущности Entity API видны организации, а не очереди'),
  },
  {
    pattern: /^\/v[23]\/boards/,
    methods: 'any',
    decide: () => deny('доски и их колонки видны за пределами очереди'),
  },
  {
    pattern: /^\/v[23]\/sprints/,
    methods: 'any',
    decide: () => deny('спринты принадлежат доске, а доска видна за пределами очереди'),
  },
  {
    pattern: /^\/v3\/filters/,
    methods: 'any',
    decide: () => deny('сохранённые фильтры видны за пределами очереди'),
  },
];
