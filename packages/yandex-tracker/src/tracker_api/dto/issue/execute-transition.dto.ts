/**
 * DTO для выполнения перехода статуса задачи
 *
 * ВАЖНО: Содержит данные для заполнения при переходе (если требуются).
 * Используется в TransitionIssueOperation и соответствующих tools.
 */
export interface ExecuteTransitionDto {
  /** Комментарий при переходе */
  comment?: string;

  /** Дополнительные поля (для форм перехода) */
  [key: string]: unknown;
}
