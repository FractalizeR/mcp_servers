import type { WithUnknownFields } from './types.js';

/**
 * Результат полнотекстового поиска (`POST /v1/search`, пакет 7.2.C плана
 * модернизации MCP 2026-07-28).
 *
 * Все поля опциональны намеренно: точная форма результата проверена только
 * через суммаризацию detail-страницы документации (WebFetch, не verbatim),
 * а не живым вызовом API — см. `inventory/table5-wiki-api-coverage.md`,
 * предупреждение про ненадёжность суммаризации там, где она не перепроверена
 * detail-страницей. Здесь detail-страница ЧИТАЛАСЬ (`search__search.md`), но
 * гарантий verbatim-цитаты нет, поэтому поля не помечены `required` —
 * отсутствие поля в реальном ответе не должно ронять клиента.
 */
export interface SearchResult {
  readonly url?: string;
  readonly slug?: string;
  readonly title?: string;
  readonly content?: string;
  readonly type?: string;
  readonly modified_at?: string;
}

export interface SearchResponse {
  readonly results: SearchResult[];
  readonly next_cursor?: string;
  readonly prev_cursor?: string;
}

export type SearchResultWithUnknownFields = WithUnknownFields<SearchResult>;
