/**
 * Zod-схема результата (для outputSchema) одного элемента поиска —
 * зеркалирует `SearchResult` (`#wiki_api/entities/search.entity.ts`), пакет
 * 7.2.C плана модернизации MCP 2026-07-28. Все поля опциональны — см.
 * оговорку про суммаризацию документации в `search.entity.ts`.
 */

import { z } from 'zod';

export const SearchResultOutputSchema = z.object({
  url: z.string().optional(),
  slug: z.string().optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  type: z.string().optional(),
  modified_at: z.string().optional(),
});

export type SearchResultOutput = z.infer<typeof SearchResultOutputSchema>;

/** Поле `summary` результата yw_search — пагинация. */
export const SearchSummarySchema = z.object({
  next_cursor: z.string().optional(),
  prev_cursor: z.string().optional(),
});

export type SearchSummary = z.infer<typeof SearchSummarySchema>;
