/**
 * Zod-схемы результата (для outputSchema) сущности Comment Wiki API —
 * зеркалируют `Comment`/`CommentsResponse` (`#wiki_api/entities/comment.entity.ts`),
 * пакет 7.2.D плана модернизации MCP 2026-07-28.
 */

import { z } from 'zod';

const CommentAuthorOutputSchema = z.object({
  id: z.string().optional(),
  username: z.string().optional(),
  display_name: z.string().optional(),
  affiliation: z.string().optional(),
  is_dismissed: z.boolean().optional(),
});

const CommentReactionOutputSchema = z.object({
  type: z.string().optional(),
  author: CommentAuthorOutputSchema.optional(),
  created_at: z.string().optional(),
});

const CommentThreadInfoOutputSchema = z.object({
  total_posts: z.number().optional(),
  last_comment: z.unknown().optional(),
});

export const CommentOutputSchema = z.object({
  id: z.number(),
  body: z.string().optional(),
  inline_text: z.string().optional(),
  parent_id: z.number().optional(),
  thread_id: z.number().optional(),
  author: CommentAuthorOutputSchema.optional(),
  created_at: z.string().optional(),
  is_deleted: z.boolean().optional(),
  resolve_status: z.enum(['resolved', 'unresolved']).optional(),
  reactions: z.array(CommentReactionOutputSchema).optional(),
  thread_info: CommentThreadInfoOutputSchema.optional(),
});

export type CommentOutput = z.infer<typeof CommentOutputSchema>;

/** Поле `summary` результата yw_get_comments/yw_get_comment_thread — пагинация. */
export const CommentsSummarySchema = z.object({
  next_cursor: z.string().optional(),
  prev_cursor: z.string().optional(),
});

export type CommentsSummary = z.infer<typeof CommentsSummarySchema>;
