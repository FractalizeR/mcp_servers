/**
 * Ссылки на живых людей в теле мутирующего запроса.
 *
 * Три раунда ревью нашли один и тот же дефект — поле тела, назначающее живого
 * человека организации, которое рубеж не проверяет: сперва `lead`, потом
 * `subjects`, потом `assignee` ключевого результата, `assignee`/`summonees`
 * задачи, `lead` компонента, `values.assignee` массовой операции. Промахом был не
 * пропущенный ревьюером случай, а способ: перечень опасных полей был чёрным
 * списком, и его полнота зависела от догадки.
 *
 * Поэтому тело обходится ЦЕЛИКОМ, на любой глубине, и проверяется каждый ключ из
 * набора имён, несущих человека, где бы он ни лежал — в объекте, в массиве, во
 * вложенной структуре. Поле с известным именем попадает под проверку само, без
 * правки правил; поле с неизвестным именем ловится белым списком ключей у тех
 * семейств, где тело закрыто (`organization-rules.ts`).
 */

import type { Body, ScopeContext } from './rule-matching.js';
import { isRecord, refOf } from './rule-matching.js';

/**
 * Имена полей, значение которых адресует человека.
 *
 * Снято перечислением по `src/tools/**\/*.schema.ts`, `src/tracker_api/dto/**` и
 * `src/tracker_api/entities/**` (таблица «поле × где встречается» — в отчёте ревью
 * 2026-08-25). Дополнено полями API Трекера, которых в наших схемах пока нет:
 * ложный отказ здесь стоит сорванного прогона, ложный допуск — чужих данных.
 */
const PERSON_FIELDS: ReadonlySet<string> = new Set(
  [
    'assignee',
    'defaultAssignee',
    'lead',
    'followers',
    'summonees',
    'maillistSummonees',
    'subjects',
    'teamUserIds',
    'teamUsers',
    'createdBy',
    'updatedBy',
    'author',
    'owner',
    'responsible',
    'participants',
    'users',
    'userIds',
    'watchers',
    'reporter',
    'voters',
    'members',
    'grantees',
  ].map((field) => field.toLowerCase())
);

export const isPersonField = (key: string): boolean => PERSON_FIELDS.has(key.toLowerCase());

/**
 * Обёртка `{ add: [...] }` / `{ remove: [...] }` распознаётся, только когда это
 * ЕДИНСТВЕННЫЕ ключи объекта. Рубеж обязан быть fail-closed: объект вида
 * `{ add: [...], id: 'кто-то' }` — форма, которую этот код не понимает, а не
 * законная обёртка с довеском, — иначе `id` молча пропадал бы из проверки и рубеж
 * разрешал бы то, что раньше отклонял (найдено ревью 2026-08-26).
 */
function isAddRemoveWrapper(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((key) => key === 'add' || key === 'remove');
}

/**
 * Ссылки на людей: строка/число, объект `{id}`/`{login}`, список того же либо
 * обёртка `{ add: [...] }` / `{ remove: [...] }` (`manage_queue_access`,
 * `api-ref/queues/manage-access`) — рекурсия распаковывает её так же, как массив.
 */
function personRefs(value: unknown): readonly string[] | undefined {
  // `null` — не ссылка, а снятие ссылки: `assignee: null` освобождает исполнителя.
  if (value === null) return [];
  if (Array.isArray(value)) {
    const collected: string[] = [];
    for (const entry of value) {
      const nested = personRefs(entry);
      if (nested === undefined) return undefined;
      collected.push(...nested);
    }
    return collected;
  }
  if (isRecord(value) && isAddRemoveWrapper(value)) {
    const collected: string[] = [];
    for (const key of ['add', 'remove'] as const) {
      if (!(key in value)) continue;
      const nested = personRefs(value[key]);
      if (nested === undefined) return undefined;
      collected.push(...nested);
    }
    return collected;
  }
  const reference =
    refOf(value, 'id') ?? (isRecord(value) ? refOf(value['login'], 'id') : undefined);
  return reference === undefined ? undefined : [reference];
}

/**
 * Ссылка на человека законна, только если это владелец прогона: `lead` и участники —
 * живые люди организации, и запрос прогона назначает им роли по-настоящему.
 */
export function personViolation(
  field: string,
  value: unknown,
  context: ScopeContext
): string | undefined {
  if (value === undefined) return undefined;
  if (context.runOwner === undefined) {
    return (
      `${field} ссылается на живого человека организации, а владелец прогона не объявлен: ` +
      'задайте переменную YANDEX_TRACKER_LIVE_SCOPE_RUN_OWNER'
    );
  }
  const people = personRefs(value);
  if (people === undefined) return `${field}: ссылка на человека не распознана`;
  if (people.length === 0) return undefined;
  const foreign = people.find((person) => person !== context.runOwner);
  return foreign === undefined
    ? undefined
    : `${field} назначает человека ${foreign}, а не владельца прогона ${context.runOwner}`;
}

/** Путь до поля в теле — попадает в текст отказа: без него причину не найти. */
function join(path: string, key: string): string {
  return path === '' ? key : `${path}.${key}`;
}

/**
 * Первое поле-человека в теле, ссылающееся не на владельца прогона, — на любой
 * глубине. Проверяются все семейства запросов, включая задачи и массовые операции,
 * где белого списка ключей нет и быть не может (у задачи произвольные поля).
 */
export function foreignPersonInBody(body: Body, context: ScopeContext): string | undefined {
  return walk(body, '', context);
}

function walk(value: unknown, path: string, context: ScopeContext): string | undefined {
  if (Array.isArray(value)) {
    for (const [index, entry] of value.entries()) {
      const problem = walk(entry, `${path}[${index}]`, context);
      if (problem !== undefined) return problem;
    }
    return undefined;
  }
  if (!isRecord(value)) return undefined;

  for (const [key, nested] of Object.entries(value)) {
    const here = join(path, key);
    if (isPersonField(key)) {
      const problem = personViolation(here, nested, context);
      if (problem !== undefined) return problem;
      continue;
    }
    const problem = walk(nested, here, context);
    if (problem !== undefined) return problem;
  }
  return undefined;
}
