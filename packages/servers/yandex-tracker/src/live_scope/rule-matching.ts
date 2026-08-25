/**
 * Механика сопоставления: из чего состоит правило, как из тела запроса достаются
 * имя и ссылки и как из этого собираются правила одного семейства.
 *
 * Предмет отделён от самих таблиц правил (`sandbox-queue-rules.ts`,
 * `organization-rules.ts`): таблицы растут с каждым новым инструментом, а способ
 * разбора тела и форма правила — нет.
 */

import type { OutgoingRequest } from '@fractalizer/mcp-infrastructure';
import type { RunJournal, EntityKind } from './run-journal.js';

export interface ScopeDecision {
  readonly allowed: boolean;
  /** Почему решение такое — попадает в текст ошибки живого прогона. */
  readonly reason: string;
}

export interface ScopeContext {
  readonly sandboxQueue: string;
  readonly journal: RunJournal;
  /** Заполнена — рубеж отклоняет всё: пишущий прогон без объявленной области. */
  readonly refuseEverything?: string;
  /** Обязательная подстрока в имени создаваемой сущности организации. */
  readonly runPrefix?: string | undefined;
  /** Ключ одноразовой очереди, которую прогону разрешено создать и разобрать. */
  readonly disposableQueue?: string | undefined;
  /** Единственный человек, на которого тело запроса вправе ссылаться. */
  readonly runOwner?: string | undefined;
}

/** Тело запроса, приведённое к объекту (`asRecord`). */
export type Body = Record<string, unknown> | undefined;
export type BodyViolation = (body: Body, context: ScopeContext) => string | undefined;

export interface ScopeRule {
  readonly pattern: RegExp;
  /** Методы в нижнем регистре, к которым правило применимо; `any` — любые. */
  readonly methods: readonly string[] | 'any';
  /**
   * Правило описывает чтение под видом POST (поиск). Тело такого запроса — это
   * фильтр, а не назначение: `assignee` в нём никого не назначает, и общая
   * проверка ссылок на людей к нему не применяется.
   */
  readonly readsOnly?: boolean;
  readonly decide: (
    match: RegExpExecArray,
    request: OutgoingRequest,
    context: ScopeContext
  ) => ScopeDecision;
}

export const allow = (reason: string): ScopeDecision => ({ allowed: true, reason });
export const deny = (reason: string): ScopeDecision => ({ allowed: false, reason });

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Тело запроса как объект; FormData и строки объектом не считаются. */
export function asRecord(data: unknown): Body {
  if (typeof data !== 'string') return isRecord(data) ? data : undefined;
  try {
    const parsed: unknown = JSON.parse(data);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Ссылка на сущность: строкой/числом либо объектом (`{ key: 'TEST' }`, `{ id: 42 }`).
 * `fixed` — форма элемента фильтра доски (`{ fixed: 'TEST' }`).
 */
export function refOf(value: unknown, field: 'id' | 'key' | 'fixed'): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object' && value !== null) {
    const raw = (value as Record<string, unknown>)[field];
    if (typeof raw === 'string') return raw;
    if (typeof raw === 'number') return String(raw);
  }
  return undefined;
}
export const queueKeyOf = (value: unknown): string | undefined => refOf(value, 'key');
export const issueKeyOf = (value: unknown): string | undefined => refOf(value, 'key');

/** Значение по цепочке вложенных объектов; любое звено не объект — `undefined`. */
export function nestedValue(root: unknown, path: readonly string[]): unknown {
  let node: unknown = root;
  for (const segment of path) {
    if (!isRecord(node)) return undefined;
    node = node[segment];
  }
  return node;
}

/** Имя сущности организации: строка либо объект локализации (`{ ru, en }`). */
function nameCandidates(value: unknown): readonly string[] {
  if (typeof value === 'string') return [value];
  if (isRecord(value)) {
    return Object.values(value).filter((entry): entry is string => typeof entry === 'string');
  }
  return [];
}

/**
 * Префикс обязателен в КАЖДОМ непустом языке имени: сущность ищут по нему поиском,
 * когда журнал потерян вместе с процессом, а поиск идёт по отображаемому имени —
 * `{ru: 'чужое', en: '<префикс> проба'}` по русскому запросу не найдётся.
 */
export function hasRunPrefix(nameValue: unknown, prefix: string): boolean {
  const candidates = nameCandidates(nameValue).filter((entry) => entry.trim() !== '');
  return candidates.length > 0 && candidates.every((entry) => entry.includes(prefix));
}

export type PrefixCheck =
  | { readonly ok: true; readonly prefix: string }
  | { readonly ok: false; readonly decision: ScopeDecision };
/** Без префикса созданное неотличимо от чужого — обязателен для создания. */
export function requireRunPrefix(context: ScopeContext): PrefixCheck {
  if (context.runPrefix === undefined) {
    return {
      ok: false,
      decision: deny(
        'создание сущностей организации требует префикса прогона: задайте переменную ' +
          'YANDEX_TRACKER_LIVE_SCOPE_RUN_PREFIX'
      ),
    };
  }
  return { ok: true, prefix: context.runPrefix };
}

/**
 * Очередь области прогона: песочная либо одноразовая, и одноразовая — по журналу.
 * Совпадения с переменной окружения мало: создание очереди могло не состояться, и
 * тогда ключ из переменной адресует чужую очередь либо не существует вовсе.
 */
export const queueWithinScope = (key: string | undefined, context: ScopeContext): boolean => {
  if (key === undefined) return false;
  if (key === context.sandboxQueue) return true;
  return key === context.disposableQueue && context.journal.has('queue', key);
};
/** Ссылки на очереди не должны выводить сущность за пределы прогона; `undefined` — поле не задано. */
export function queueRefsWithinScope(value: unknown, context: ScopeContext): boolean {
  if (value === undefined) return true;
  if (!Array.isArray(value)) return false;
  return value.every((entry) => queueWithinScope(queueKeyOf(entry), context));
}
export const queueRefWithinScope = (value: unknown, context: ScopeContext): boolean =>
  queueWithinScope(queueKeyOf(value), context);

/**
 * Тело семейства с закрытой формой разрешается по белому списку ключей.
 *
 * Чёрный список опасных полей полон ровно настолько, насколько догадлив ревьюер:
 * так подряд были пропущены `lead`, `subjects` и `assignee` ключевого результата.
 * Неизвестный ключ — отказ с его именем, а не молчаливый пропуск.
 */
export function allowedKeysViolation(
  label: string,
  keys: readonly string[]
): (body: Body) => string | undefined {
  const allowed = new Set(keys);
  return (body) => {
    if (body === undefined) return undefined;
    const unknown = Object.keys(body).find((key) => !allowed.has(key));
    return unknown === undefined
      ? undefined
      : `${label}: ключ тела ${unknown} рубежу неизвестен, состав тела ограничен ` +
          `перечнем ${[...allowed].join(', ')}`;
  };
}

/** Проверки тела складываются: нарушением считается первое сработавшее. */
export function bothViolations(
  first: BodyViolation | undefined,
  second: BodyViolation | undefined
): BodyViolation | undefined {
  if (first === undefined) return second;
  if (second === undefined) return first;
  return (body, context) => first(body, context) ?? second(body, context);
}

/** {@link createRule}: `nameOf`/`fieldLabel` — проверяемое поле (по умолчанию
 * `body.name`, «имя»); `violation` — проверка тела сверх префикса. */
export interface CreateRuleOptions {
  readonly nameOf?: ((body: Body) => unknown) | undefined;
  readonly fieldLabel?: string | undefined;
  readonly violation?: BodyViolation | undefined;
}
/** «Создать сущность организации»: без префикса в текстовом поле — отказ. */
export function createRule(
  pattern: RegExp,
  label: string,
  options: CreateRuleOptions = {}
): ScopeRule {
  const nameOf = options.nameOf ?? ((body: Body): unknown => body?.['name']);
  return {
    pattern,
    methods: ['post'],
    decide: (_match, request, context): ScopeDecision => {
      const prefixCheck = requireRunPrefix(context);
      if (!prefixCheck.ok) return prefixCheck.decision;
      const body = asRecord(request.data);
      if (!hasRunPrefix(nameOf(body), prefixCheck.prefix)) {
        const field = options.fieldLabel ?? 'имя';
        return deny(`${label}: ${field} не содержит префикс прогона ${prefixCheck.prefix}`);
      }
      const problem = options.violation?.(body, context);
      return problem !== undefined
        ? deny(problem)
        : allow(`создание: ${label} прогона с префиксом ${prefixCheck.prefix}`);
    },
  };
}

/** {@link ownershipRule}: `idOf` — id из совпадения (по умолчанию первая группа). */
export interface OwnershipRuleOptions {
  readonly idOf?: ((match: RegExpExecArray) => string) | undefined;
  readonly violation?: BodyViolation | undefined;
}
/** «Правка/удаление по журналу» — единственное основание для непрозрачных id организации. */
export function ownershipRule(
  pattern: RegExp,
  methods: readonly string[] | 'any',
  kind: EntityKind,
  label: string,
  options: OwnershipRuleOptions = {}
): ScopeRule {
  const idOf = options.idOf ?? ((match: RegExpExecArray): string => match[1] ?? '');
  return {
    pattern,
    methods,
    decide: (match, request, context): ScopeDecision => {
      const id = idOf(match);
      if (!context.journal.has(kind, id)) {
        return deny(`${label} ${id} не принадлежит этому прогону`);
      }
      const problem = options.violation?.(asRecord(request.data), context);
      return problem !== undefined
        ? deny(problem)
        : allow(`${label} ${id} принадлежит этому прогону`);
    },
  };
}

/**
 * Правка не вправе снять префикс с имени собственной сущности.
 *
 * Журнал гибнет вместе с процессом, и остаток ищут ТОЛЬКО поиском по
 * отображаемому имени, — переименование без префикса снимает единственную
 * компенсацию к потере журнала. Тело без имени правку имени не затрагивает.
 */
export function nameKeepsPrefix(
  label: string,
  nameOf: (body: Body) => unknown,
  fieldLabel: string
): BodyViolation {
  return (body, context) => {
    const name = nameOf(body);
    if (name === undefined) return undefined;
    const prefixCheck = requireRunPrefix(context);
    if (!prefixCheck.ok) return prefixCheck.decision.reason;
    return hasRunPrefix(name, prefixCheck.prefix)
      ? undefined
      : `${label}: правка снимает с поля ${fieldLabel} префикс прогона ${prefixCheck.prefix} — ` +
          'без него сущность не найдётся поиском, если журнал потерян';
  };
}

/**
 * Семейство сущности организации: создание и правка одной сущности.
 *
 * `bodyViolation` объявлен на семействе, а не на правиле: право «сущность моя» не
 * даёт права перевесить её на чужого родителя или чужого человека, поэтому ссылки
 * в теле проверяются и на создании, и на правке. Рубеж не полагается на то, что
 * схема инструмента не пропустит такую ссылку: набор схем меняется, рубеж — нет.
 *
 * Перечни ключей и проверки ссылок парные: у доски и проекта создание и правка идут
 * разными маршрутами с разной формой тела (очередь доски при создании лежит в
 * `autoFilters`, при правке — в `queue`). Один общий перечень, переписанный под
 * создание, снял бы проверку очереди с правки молча.
 */
export interface OrgFamily {
  readonly label: string;
  readonly kind: EntityKind;
  readonly createPattern: RegExp;
  readonly editPattern: RegExp;
  readonly editMethods?: readonly string[] | 'any';
  readonly nameOf?: ((body: Body) => unknown) | undefined;
  readonly fieldLabel?: string | undefined;
  readonly idOf?: ((match: RegExpExecArray) => string) | undefined;
  readonly bodyViolation?: BodyViolation | undefined;
  /** Сверх общей и только на создании: ссылка, обязательная в теле создания. */
  readonly createViolation?: BodyViolation | undefined;
  /** Сверх общей и только на правке. */
  readonly editViolation?: BodyViolation | undefined;
  /** Ключи верхнего уровня, допустимые в теле правки; прочие — отказ с именем ключа. */
  readonly allowedKeys?: readonly string[] | undefined;
  /** Ключи тела создания; не задан — тем же перечнем, что и правка. */
  readonly createAllowedKeys?: readonly string[] | undefined;
}

export function orgFamilyRules(family: OrgFamily): readonly ScopeRule[] {
  const nameOf = family.nameOf ?? ((body: Body): unknown => body?.['name']);
  const fieldLabel = family.fieldLabel ?? 'имя';
  const keysViolation = (keys: readonly string[] | undefined): BodyViolation | undefined =>
    keys === undefined ? undefined : allowedKeysViolation(family.label, keys);
  const createCommon = bothViolations(
    keysViolation(family.createAllowedKeys ?? family.allowedKeys),
    family.bodyViolation
  );
  const editCommon = bothViolations(keysViolation(family.allowedKeys), family.bodyViolation);
  return [
    createRule(family.createPattern, family.label, {
      nameOf: family.nameOf,
      fieldLabel: family.fieldLabel,
      violation: bothViolations(createCommon, family.createViolation),
    }),
    ownershipRule(family.editPattern, family.editMethods ?? 'any', family.kind, family.label, {
      idOf: family.idOf,
      violation: bothViolations(
        bothViolations(editCommon, family.editViolation),
        nameKeepsPrefix(family.label, nameOf, fieldLabel)
      ),
    }),
  ];
}
