/**
 * Нормализация next-URL Яндекс.Трекера в относительный путь + query.
 *
 * Ответственность (SRP):
 * - ТОЛЬКО срезать схему/хост и применить defense-in-depth guard `/^\/v[23]\//`.
 *
 * Вынесено из `TrackerPaginator` в отдельный модуль, чтобы и паджинатор
 * (`buildMeta`/`fetchAllPages`), и `CursorCodec` (валидация декодированного пути)
 * использовали единый guard без циклической зависимости между ними.
 *
 * Аналог Python SDK `connection._strip_host`.
 */

/**
 * Превратить next-URL в относительный путь + query.
 *
 * Defense-in-depth: путь обязан начинаться с `/v2/` или `/v3/`, иначе считаем
 * URL невалидным (чужой хост / редирект / неизвестная версия API) и возвращаем
 * `undefined`.
 *
 * @param url - абсолютный или относительный next-URL
 * @returns путь+query или `undefined`, если путь не похож на API Трекера
 */
export function stripTrackerHost(url: string): string | undefined {
  const withoutScheme = url.replace(/^https?:\/\/[^/]+/i, '');
  const pathQuery = withoutScheme.length > 0 ? withoutScheme : url;

  if (!/^\/v[23]\//.test(pathQuery)) {
    return undefined;
  }

  return pathQuery;
}
