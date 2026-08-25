/**
 * Схемы URI ресурсов Трекера (пакет 5.1.C.tracker плана модернизации MCP
 * 2026-07-28):
 *
 * - `tracker://issue/{key}`   — задача, ключ (например, `PROJ-123`)
 * - `tracker://queue/{key}`   — очередь, ключ (например, `PROJ`)
 *
 * Схема `tracker://project/{id}` существовала для легаси-семейства проектов
 * (`/v3/projects`) и убрана вместе с ним 2026-08-25 — данные проектов теперь
 * только через Entity API (`entityType: 'project'`), без отдельной схемы URI.
 *
 * Файл — единственное место, которое знает формат этих URI: провайдеры
 * (`issue-resource-provider.ts` и др.) и инструменты, строящие `resource_link`
 * (например, `find_issues`), используют только эти функции, а не строят
 * строки URI вручную — иначе схема и парсер разъедутся независимо.
 *
 * Кодирование: `encodeURIComponent`/`decodeURIComponent` на сегменте пути —
 * ключи/ID Трекера не содержат `/`, но защита от случайного спецсимвола
 * дешева и не имеет недостатков.
 */

const ISSUE_URI_PREFIX = 'tracker://issue/';
const QUEUE_URI_PREFIX = 'tracker://queue/';

function buildUri(prefix: string, segment: string): string {
  return `${prefix}${encodeURIComponent(segment)}`;
}

/**
 * Распарсить URI по префиксу схемы. Возвращает `undefined`, если `uri` не
 * принадлежит этой схеме (в т.ч. если после префикса пусто) — контракт
 * `ResourceProvider.readResource`: «не мой URI» не является ошибкой.
 */
function parseUri(prefix: string, uri: string): string | undefined {
  if (!uri.startsWith(prefix)) {
    return undefined;
  }
  const segment = uri.slice(prefix.length);
  if (segment.length === 0) {
    return undefined;
  }
  try {
    return decodeURIComponent(segment);
  } catch {
    // Битый %-escape в сегменте — трактуем как «не мой URI», а не бросаем:
    // readResource() провайдера обязан вернуть undefined, не исключение,
    // для строк, которые он не может разрешить.
    return undefined;
  }
}

export function buildIssueResourceUri(issueKey: string): string {
  return buildUri(ISSUE_URI_PREFIX, issueKey);
}

export function parseIssueResourceUri(uri: string): string | undefined {
  return parseUri(ISSUE_URI_PREFIX, uri);
}

export function buildQueueResourceUri(queueKey: string): string {
  return buildUri(QUEUE_URI_PREFIX, queueKey);
}

export function parseQueueResourceUri(uri: string): string | undefined {
  return parseUri(QUEUE_URI_PREFIX, uri);
}

/** uriTemplate (RFC 6570) для `resources/templates/list` — держим рядом с парсерами. */
export const ISSUE_URI_TEMPLATE = 'tracker://issue/{key}';
export const QUEUE_URI_TEMPLATE = 'tracker://queue/{key}';
