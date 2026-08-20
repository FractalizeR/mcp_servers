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

/** Методы, которые ничего не меняют, — их область действия проверять незачем. */
const SAFE_METHODS: ReadonlySet<string> = new Set(['get', 'head', 'options']);

/** Путь без query: правила рассуждают о ресурсе, а не о его параметрах. */
function pathOf(url: string): string {
  const queryStart = url.indexOf('?');
  return queryStart === -1 ? url : url.slice(0, queryStart);
}

export function decideRequest(request: OutgoingRequest, context: ScopeContext): ScopeDecision {
  if (SAFE_METHODS.has(request.method)) {
    return { allowed: true, reason: 'метод не меняет данные' };
  }

  const path = pathOf(request.url);
  for (const rule of SCOPE_RULES) {
    if (rule.methods !== 'any' && !rule.methods.includes(request.method)) continue;
    const match = rule.pattern.exec(path);
    if (match === null) continue;
    return rule.decide(match, request, context);
  }

  // Fail-closed. Неизвестный путь — это чаще всего новый инструмент, про область
  // действия которого никто не думал; пропустить его значит узнать о промахе по
  // испорченным данным.
  return { allowed: false, reason: 'путь не описан ни одним правилом области действия' };
}

/** Что за сущность создана — определяется по пути запроса, породившего ответ. */
function createdEntityOf(request: OutgoingRequest): EntityKind | undefined {
  if (request.method !== 'post') return undefined;
  const path = pathOf(request.url);
  if (/^\/v3\/issues\/?$/.test(path)) return 'issue';
  if (/^\/v2\/queues\/[^/]+\/components\/?$/.test(path)) return 'component';
  if (/^\/v3\/queues\/[^/]+\/localFields\/?$/.test(path)) return 'queueLocalField';
  return undefined;
}

function asIdentifier(raw: unknown): string | undefined {
  if (typeof raw === 'string') return raw;
  return typeof raw === 'number' ? String(raw) : undefined;
}

/**
 * Идентификаторы созданной сущности — все, какими её потом адресуют.
 *
 * У задачи их два: ключ (`TEST-1`) и 24-hex id, и API принимает оба. Записать
 * только один значит отклонить собственный законный запрос, стоит инструменту
 * выбрать другую форму.
 */
function identifiersOf(kind: EntityKind, data: unknown): readonly string[] {
  if (typeof data !== 'object' || data === null) return [];
  const record = data as { key?: unknown; id?: unknown };
  const candidates = kind === 'issue' ? [record.key, record.id] : [record.id];
  return candidates.map(asIdentifier).filter((value): value is string => value !== undefined);
}

export class LiveScopeGuard implements HttpTrafficGuard {
  constructor(private readonly context: ScopeContext) {}

  inspectRequest(request: OutgoingRequest): void {
    const decision = decideRequest(request, this.context);
    if (decision.allowed) return;
    throw new ScopeViolationError(
      `Живой прогон ограничен очередью ${this.context.sandboxQueue}. ` +
        `Запрос ${request.method.toUpperCase()} ${request.url} отклонён: ${decision.reason}.`
    );
  }

  observeResponse(response: ObservedResponse): void {
    const kind = createdEntityOf(response.request);
    if (kind === undefined) return;
    for (const identifier of identifiersOf(kind, response.data)) {
      this.context.journal.register(kind, identifier);
    }
  }
}
