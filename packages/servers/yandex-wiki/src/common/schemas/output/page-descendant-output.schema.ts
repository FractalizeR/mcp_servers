/**
 * Zod-схема результата (для outputSchema) элемента поддерева страницы —
 * зеркалирует `PageDescendant` (`#wiki_api/entities/page.entity.ts`), пакет
 * 7.2.C плана модернизации MCP 2026-07-28.
 */

import { z } from 'zod';

export const PageDescendantOutputSchema = z.object({
  id: z.number(),
  slug: z.string(),
});

export type PageDescendantOutput = z.infer<typeof PageDescendantOutputSchema>;

/** Поле `summary` результата yw_get_descendants(_by_id) — пагинация. */
export const DescendantsSummarySchema = z.object({
  next_cursor: z.string().optional(),
  prev_cursor: z.string().optional(),
});

export type DescendantsSummary = z.infer<typeof DescendantsSummarySchema>;
