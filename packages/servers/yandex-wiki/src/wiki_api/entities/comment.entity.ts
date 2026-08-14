import type { WithUnknownFields } from './types.js';

/**
 * Комментарии к странице (`/pages/{id}/comments`, пакет 7.2.D плана
 * модернизации MCP 2026-07-28). Форма подтверждена detail-страницами
 * документации (`pagescomments__comments.md`,
 * `pagescomments__create_comment.md`, `pagescomments__thread_comments.md`,
 * `pagescomments__delete_comment.md`) — не только суммаризацией индекса
 * (см. предупреждение в `inventory/table5-wiki-api-coverage.md` про то, что
 * суммаризация НЕ перепроверенных detail-страницей разделов один раз уже
 * ошиблась с HTTP-глаголом).
 */

export interface CommentAuthor {
  readonly id?: string;
  readonly username?: string;
  readonly display_name?: string;
  readonly affiliation?: string;
  readonly is_dismissed?: boolean;
}

export interface CommentReaction {
  readonly type?: string;
  readonly author?: CommentAuthor;
  readonly created_at?: string;
}

export interface CommentThreadInfo {
  readonly total_posts?: number;
  readonly last_comment?: unknown;
}

export type CommentResolveStatus = 'resolved' | 'unresolved';

export interface Comment {
  readonly id: number;
  readonly body?: string;
  readonly inline_text?: string;
  readonly parent_id?: number;
  readonly thread_id?: number;
  readonly author?: CommentAuthor;
  readonly created_at?: string;
  readonly is_deleted?: boolean;
  readonly resolve_status?: CommentResolveStatus;
  readonly reactions?: CommentReaction[];
  readonly thread_info?: CommentThreadInfo;
}

export interface CommentsResponse {
  readonly results: Comment[];
  readonly next_cursor?: string;
  readonly prev_cursor?: string;
}

export interface DeleteCommentResult {
  readonly comments_count: number;
}

export type CommentWithUnknownFields = WithUnknownFields<Comment>;
