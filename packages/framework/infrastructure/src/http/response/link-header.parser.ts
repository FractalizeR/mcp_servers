/**
 * Парсер HTTP-заголовка `Link` (RFC 5988).
 *
 * Ответственность (SRP):
 * - ТОЛЬКО разбор значения заголовка `Link` на пары `rel → URL`.
 *
 * Generic-примитив HTTP-слоя: не знает о доменной модели Трекера.
 * Используется механизмами пагинации (`rel="next"`, `rel="seek"` и т.п.).
 *
 * Пример заголовка:
 *   <https://api/issues?page=2>; rel="next", <https://api/issues?{&page}>; rel="seek"
 */

/**
 * Результат разбора заголовка `Link`: соответствие `rel → URL`.
 *
 * Именованные поля (`next`/`prev`/`first`/`last`/`seek`) — для частых rel,
 * индексная сигнатура — для произвольных.
 */
export interface ParsedLinkHeader {
  readonly [rel: string]: string | undefined;
}

/**
 * Разобрать значение заголовка `Link`.
 *
 * Корректно обрабатывает запятые внутри query-строки URL (split только по
 * запятым, за которыми следует `<` — начало следующей ссылки).
 *
 * @param headerValue - значение заголовка `Link` (или undefined, если его нет)
 * @returns соответствие `rel → URL` (пустой объект, если заголовка нет)
 */
export function parseLinkHeader(headerValue?: string): ParsedLinkHeader {
  const result: Record<string, string> = {};

  if (!headerValue) {
    return result;
  }

  // Разделяем по запятым, после которых начинается новая ссылка `<...>`,
  // чтобы не разорвать URL с запятыми в query (например, expand=a,b).
  const entries = headerValue.split(/,(?=\s*<)/);

  for (const entry of entries) {
    const linkMatch = /<([^>]*)>\s*;\s*(.*)/s.exec(entry.trim());
    if (!linkMatch) {
      continue;
    }

    const url = (linkMatch[1] ?? '').trim();
    const attrs = linkMatch[2] ?? '';
    if (url.length === 0) {
      continue;
    }

    const relMatch = /rel\s*=\s*"?([^";]+)"?/.exec(attrs);
    const rel = relMatch?.[1]?.trim();
    if (rel && rel.length > 0) {
      // RFC 5988: rel — регистронезависим и может содержать несколько
      // space-separated токенов (`rel="next prev"`). Регистрируем URL под
      // каждым токеном в lowercase, чтобы поиск по `next`/`seek` был надёжным.
      for (const token of rel.toLowerCase().split(/\s+/)) {
        if (token.length > 0) {
          result[token] = url;
        }
      }
    }
  }

  return result;
}
