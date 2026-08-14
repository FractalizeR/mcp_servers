/**
 * DTO тела запроса `POST /v1/pages/{idx}/comments` (пакет 7.2.D). Форма
 * подтверждена detail-страницей `pagescomments__create_comment.md`.
 */
export interface CreateCommentDto {
  readonly body: string;
  readonly inline_text?: string;
  readonly parent_id?: number;
  readonly thread_id?: number;
}
