/**
 * DTO для редактирования комментария
 *
 * Используется в EditCommentOperation и yandex_tracker_edit_comment tool.
 */
export interface EditCommentInput {
  /** Новый текст комментария (обязательно) */
  text: string;
}
