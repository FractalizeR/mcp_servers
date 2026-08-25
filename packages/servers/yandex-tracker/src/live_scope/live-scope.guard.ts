/**
 * Рубеж области действия живого прогона: решает по каждому исходящему запросу
 * и пополняет журнал прогона идентификаторами созданного.
 */

import { ScopeViolationError } from '@fractalizer/mcp-infrastructure';
import type {
  HttpTrafficGuard,
  OutgoingRequest,
  ObservedResponse,
} from '@fractalizer/mcp-infrastructure';
import type { ScopeContext, ScopeDecision } from './scope-rules.js';
import { SCOPE_RULES } from './scope-rules.js';
import type { EntityKind } from './run-journal.js';
import { canonicalRequestPath } from './request-path.js';
import { asRecord } from './rule-matching.js';
import { foreignPersonInBody } from './people-in-body.js';

/** Методы, которые ничего не меняют, — их область действия проверять незачем. */
const SAFE_METHODS: ReadonlySet<string> = new Set(['get', 'head', 'options']);

export function decideRequest(incoming: OutgoingRequest, context: ScopeContext): ScopeDecision {
  // Регистр метода приводим сами: `describeRequest` в клиенте это делает, но
  // рубеж не должен зависеть от аккуратности вызывающего — «DELETE» мимо
  // SAFE_METHODS прошёл бы как незнакомый метод.
  const request: OutgoingRequest = { ...incoming, method: incoming.method.toLowerCase() };

  if (SAFE_METHODS.has(request.method)) {
    return { allowed: true, reason: 'метод не меняет данные' };
  }

  if (context.refuseEverything !== undefined) {
    return { allowed: false, reason: context.refuseEverything };
  }

  const breakage = context.journal.breakage();
  if (breakage !== undefined) {
    return { allowed: false, reason: `журнал прогона потерял достоверность: ${breakage}` };
  }

  const verdict = canonicalRequestPath(request.url);
  if (verdict.path === undefined) {
    return { allowed: false, reason: verdict.rejection ?? 'путь непригоден для сопоставления' };
  }
  const path = verdict.path;

  for (const rule of SCOPE_RULES) {
    if (rule.methods !== 'any' && !rule.methods.includes(request.method)) continue;
    const match = rule.pattern.exec(path);
    if (match === null) continue;
    const decision = rule.decide(match, request, context);
    if (!decision.allowed || rule.readsOnly === true) return decision;
    // Ссылки на людей проверяются здесь, а не в каждом правиле: полнота такой
    // проверки не должна зависеть от того, вспомнил ли автор правила про поле.
    const person = foreignPersonInBody(asRecord(request.data), context);
    return person === undefined ? decision : { allowed: false, reason: person };
  }

  // Fail-closed. Неизвестный путь — это чаще всего новый инструмент, про область
  // действия которого никто не думал; пропустить его значит узнать о промахе по
  // испорченным данным.
  return { allowed: false, reason: 'путь не описан ни одним правилом области действия' };
}

/** Что создано этим запросом: род и, у составного идентификатора, его префикс. */
interface CreatedEntity {
  readonly kind: EntityKind;
  /** Стоит перед id составного идентификатора рода `entity` — тип Entity API (`goal`, …). */
  readonly idPrefix?: string;
}

/** Что за сущность создана — определяется по пути запроса, породившего ответ. */
function createdEntityOf(request: OutgoingRequest): CreatedEntity | undefined {
  if (request.method !== 'post') return undefined;
  const path = canonicalRequestPath(request.url).path;
  if (path === undefined) return undefined;
  if (/^\/v3\/issues\/?$/.test(path)) return { kind: 'issue' };
  if (/^\/v3\/components\/?$/.test(path)) return { kind: 'component' };
  if (/^\/v3\/queues\/[^/]+\/localFields\/?$/.test(path)) return { kind: 'queueLocalField' };
  // Доска создаётся на `liveBoards`, а адресуется потом по `/v3/boards/{id}`:
  // детектор стоит на маршруте создания, иначе своя доска не попадёт в журнал.
  if (/^\/v3\/liveBoards\/?$/.test(path)) return { kind: 'board' };
  if (/^\/v3\/sprints\/?$/.test(path)) return { kind: 'sprint' };
  if (/^\/v3\/fields\/?$/.test(path)) return { kind: 'globalField' };
  if (/^\/v3\/filters\/?$/.test(path)) return { kind: 'filter' };
  // Якорено `$`: `/v3/queues/{q}/localFields` проверен выше и сюда не долетает,
  // но без якоря совпал бы тоже.
  if (/^\/v3\/queues\/?$/.test(path)) return { kind: 'queue' };
  const entityMatch = /^\/v3\/entities\/([^/?]+)\/?$/.exec(path);
  if (entityMatch !== null) return { kind: 'entity', idPrefix: entityMatch[1] ?? '' };
  return undefined;
}

function asIdentifier(raw: unknown): string | undefined {
  if (typeof raw === 'string') return raw;
  return typeof raw === 'number' ? String(raw) : undefined;
}

/**
 * Поля ответа, из которых для каждого рода собираются идентификаторы, какими
 * сущность потом адресуют. Составлено по таблице плана этапа 5.1: `queue`
 * допускает адресацию и по `id`, и по `key`; у остальных родов (кроме
 * `entity`, см. `identifiersOf`) второй формы адресации нет.
 *
 * Поля обоих родов адресуются двояко и по третьему адресу: `PATCH` локального
 * поля идёт по короткому `key` (`myField`), а не по глобальному `id`
 * (`<hex>--myField`), и ключом же поле стоит в теле задачи. Записи одного `id`
 * не хватало ни на собственную правку, ни на проверку пользовательских полей
 * (`custom-fields-in-body.ts`).
 */
const IDENTIFIER_FIELDS: Readonly<Record<Exclude<EntityKind, 'entity'>, readonly string[]>> = {
  issue: ['key', 'id'],
  component: ['id'],
  queueLocalField: ['id', 'key'],
  queue: ['id', 'key'],
  board: ['id'],
  sprint: ['id'],
  globalField: ['id', 'key'],
  filter: ['id'],
};

/**
 * Идентификаторы созданной сущности — все, какими её потом адресуют.
 *
 * У рода `entity` идентификатор составной (`{type}/{id}`): без типа из пути
 * запроса `id` другого рода Entity API совпал бы с чужой сущностью.
 */
function identifiersOf(entity: CreatedEntity, data: unknown): readonly string[] {
  if (typeof data !== 'object' || data === null) return [];
  const record = data as Record<string, unknown>;

  if (entity.kind === 'entity') {
    const id = asIdentifier(record['id']);
    if (id === undefined) return [];
    const prefix = entity.idPrefix ?? '';
    const identifiers = [`${prefix}/${id}`];
    const shortId = asIdentifier(record['shortId']);
    if (shortId !== undefined) identifiers.push(`${prefix}/${shortId}`);
    return identifiers;
  }

  return IDENTIFIER_FIELDS[entity.kind]
    .map((field) => asIdentifier(record[field]))
    .filter((value): value is string => value !== undefined);
}

export class LiveScopeGuard implements HttpTrafficGuard {
  constructor(private readonly context: ScopeContext) {}

  inspectRequest(request: OutgoingRequest): void {
    const decision = decideRequest(request, this.context);
    if (decision.allowed) return;
    const preamble =
      this.context.refuseEverything === undefined
        ? `Живой прогон ограничен очередью ${this.context.sandboxQueue}. `
        : '';
    throw new ScopeViolationError(
      `${preamble}Запрос ${request.method.toUpperCase()} ${request.url} отклонён: ${decision.reason}.`
    );
  }

  observeResponse(response: ObservedResponse): void {
    // Регистр приводится и здесь, а не только в `decideRequest`: «POST» мимо
    // детектора оставил бы созданное без учёта, то есть вне уборки и без права
    // на собственную же правку.
    const request: OutgoingRequest = {
      ...response.request,
      method: response.request.method.toLowerCase(),
    };
    const entity = createdEntityOf(request);
    if (entity === undefined) return;
    for (const identifier of identifiersOf(entity, response.data)) {
      this.context.journal.register(entity.kind, identifier);
    }
  }
}
