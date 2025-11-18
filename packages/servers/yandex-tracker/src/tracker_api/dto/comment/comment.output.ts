/**
 * DTO для ответов API, связанных с комментариями
 */
import type { Comment } from '../../entities/comment/index.js';

/**
 * Ответ с одним комментарием
 *
 * Используется в AddCommentOperation и EditCommentOperation.
 */
export interface CommentOutput {
  comment: Comment;
}

/**
 * Ответ со списком комментариев
 *
 * Используется в GetCommentsOperation.
 */
export interface CommentsListOutput {
  comments: Comment[];
  total?: number;
}
