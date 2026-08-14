/**
 * DTO тела запроса `POST /v1/search` (пакет 7.2.C плана модернизации MCP
 * 2026-07-28). Форма подтверждена detail-страницей документации
 * (`search__search.md`), см. `SearchResult` в `entities/search.entity.ts` про
 * оговорку о суммаризации.
 */

/**
 * Все опциональные поля явно допускают `| undefined` (а не просто `?:`) —
 * зеркалирует форму, которую `z.infer` даёт для `.optional()` под
 * `exactOptionalPropertyTypes: true`. Без этого TS отклоняет присваивание
 * zod-провалидированного объекта (у которого те же поля типизированы как
 * `T | undefined`) в DTO при прямой передаче `filters` из tool в operation —
 * проверено эмпирически при первой попытке.
 */
export interface SearchAuthorDto {
  readonly uid?: string | undefined;
  readonly cloud_uid?: string | undefined;
}

export interface SearchDateIntervalDto {
  readonly from?: string | undefined;
  readonly to?: string | undefined;
}

export interface SearchFiltersDto {
  readonly type?: 'file' | 'page' | undefined;
  readonly authors?: SearchAuthorDto[] | undefined;
  readonly cluster?: string | undefined;
  readonly created_at?: SearchDateIntervalDto | undefined;
  readonly modified_at?: SearchDateIntervalDto | undefined;
  readonly show_obsolete?: boolean | undefined;
}

export interface SearchDto {
  readonly query: string;
  readonly cursor?: number;
  readonly limit?: number;
  readonly order_by?: 'relevancy' | 'creation_date' | 'modified_date';
  readonly highlight?: boolean;
  readonly filters?: SearchFiltersDto;
}
