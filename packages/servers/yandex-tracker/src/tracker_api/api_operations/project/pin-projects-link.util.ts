/**
 * Починка заголовка `Link` у ответов `/v2/projects`.
 *
 * ЖИВАЯ ПРОБА 2026-08-20: API на `GET /v2/projects` отдаёт `Link` со ссылками
 * на ЧУЖУЮ коллекцию — `/v2/queues` (rel=first/next/last/seek), при этом тело
 * страницы и `X-Total-Count` относятся именно к проектам. Пагинатор доверяет
 * `Link` вслепую, поэтому со второй страницы инструмент отдавал очереди под
 * видом проектов, а `fetchAll` завершался с `fetchedAll:true` и `total` от
 * очередей, потеряв часть проектов, — то есть молча портил данные.
 *
 * Ссылки генерирует хендлер ОЧЕРЕДЕЙ, поэтому доверять в них нечему, кроме
 * номера страницы: `perPage` он отражает, `expand` переносит, а `queueId`
 * теряет (проверено там же). Отсюда правило: из чужой ссылки берётся ТОЛЬКО
 * `page`, весь остальной путь и query собираются из нашего собственного
 * запроса. `page` на `/v2/projects` API поддерживает (проверено).
 */

const PROJECTS_PATH = '/v2/projects';
const BASE = 'https://api.tracker.yandex.net';

/**
 * Собрать нашу ссылку на страницу проектов.
 *
 * @param ownQuery - query нашего запроса (без `page`)
 * @param page - номер страницы из чужой ссылки; `undefined` для шаблона seek
 * @param pageTemplate - хвост-шаблон RFC 6570 из seek-ссылки (например `{&page}`)
 */
function buildOwnUrl(
  ownQuery: URLSearchParams,
  page: string | undefined,
  pageTemplate: string
): string {
  const query = new URLSearchParams(ownQuery);
  query.delete('page');
  if (page !== undefined) {
    query.set('page', page);
  }
  const queryString = query.toString();
  return `${PROJECTS_PATH}${queryString.length > 0 ? `?${queryString}` : ''}${pageTemplate}`;
}

/** Переписать одну ссылку из `Link` на наш путь, сохранив только номер страницы. */
function rewriteUrl(url: string, ownQuery: URLSearchParams): string {
  // Пустая ссылка `<>` — не «относительный URL», а испорченный заголовок:
  // `new URL('', base)` её НЕ отвергает, а молча возвращает базу, и такая
  // ссылка превратилась бы в валидный курсор на первую страницу, из-за чего
  // `fetchAll` крутился бы по ней до защитного лимита.
  if (url.trim().length === 0) {
    return url;
  }

  // Шаблон seek-ссылки (`...{&page}`) — не часть query, `URL` его не разберёт
  // как параметр; отделяем и возвращаем на место нетронутым, иначе пропадёт
  // `rel="seek"`-семантика и с ней seek-gating (`total`/`totalPages`).
  const templateMatch = /\{[^}]*\}$/.exec(url);
  const pageTemplate = templateMatch?.[0] ?? '';
  const bare = pageTemplate.length > 0 ? url.slice(0, -pageTemplate.length) : url;

  try {
    const parsed = new URL(bare, BASE);
    const page = parsed.searchParams.get('page') ?? undefined;
    return buildOwnUrl(ownQuery, page, pageTemplate);
  } catch {
    // Неразбираемый URL оставляем как есть — пусть падает дальше по цепочке
    // явно, а не превращается здесь в тихо подменённый путь.
    return url;
  }
}

/**
 * Вернуть заголовки, в которых ссылки `Link` ведут на `/v2/projects` с нашим
 * собственным query.
 *
 * @param headers - заголовки ответа `/v2/projects`
 * @param requestPath - путь нашего запроса (источник `perPage`/`expand`/`queueId`)
 */
export function pinProjectsLinkHeader(
  headers: Record<string, string>,
  requestPath: string
): Record<string, string> {
  const link = headers['link'];
  if (link === undefined || link.length === 0) {
    return headers;
  }

  const ownQuery = new URL(requestPath, BASE).searchParams;
  const pinned = link.replace(
    /<([^>]*)>/g,
    (_match, url: string) => `<${rewriteUrl(url, ownQuery)}>`
  );
  return { ...headers, link: pinned };
}

/**
 * Путь курсора обязан адресовать проекты. Курсор, выданный до починки `Link`
 * (или подделанный), иначе увёл бы запрос на очереди, а ответ был бы помечен
 * как проекты — причём его `Link` тут же «починился» бы, скрыв улику.
 */
export function isProjectsPath(path: string): boolean {
  try {
    return new URL(path, BASE).pathname === PROJECTS_PATH;
  } catch {
    return false;
  }
}
