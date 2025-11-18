/**
 * DTO для добавления комментария к задаче
 *
 * Используется в AddCommentOperation и yandex_tracker_add_comment tool.
 */
export interface AddCommentInput {
  /** Текст комментария (обязательно) */
  text: string;

  /** Идентификаторы вложений (опционально) */
  attachmentIds?: string[];
}
