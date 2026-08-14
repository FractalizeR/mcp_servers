/**
 * DTO для добавления комментария к задаче
 *
 * Используется в AddCommentOperation и yandex_tracker_add_comment tool.
 */
export interface AddCommentInput {
  /** Текст комментария (обязательно) */
  text: string;

  /** Идентификаторы вложений (опционально) */
  attachmentIds?: string[] | undefined;

  /** Логины или ID пользователей для упоминания (@) — уходит в тело запроса */
  summonees?: string[] | undefined;

  /** Email-адреса рассылок для упоминания — уходит в тело запроса */
  maillistSummonees?: string[] | undefined;

  /** Формат разметки текста комментария (например, 'md') — уходит в тело запроса */
  markupType?: string | undefined;

  /**
   * Добавлять ли упомянутых (summonees) в наблюдатели задачи.
   * ВАЖНО: в отличие от остальных полей уходит query-параметром, а не в тело запроса —
   * см. AddCommentOperation.execute().
   */
  isAddToFollowers?: boolean | undefined;
}

/**
 * Элемент batch-режима добавления комментариев: AddCommentInput + issueId.
 *
 * Единственный источник истины для формы batch-элемента: используется в
 * AddCommentOperation.executeMany(), CommentService.addCommentsMany() и
 * YandexTrackerFacade.addCommentsMany(), чтобы новое поле, добавленное в
 * AddCommentInput, не потерялось на одном из промежуточных слоёв.
 */
export type AddCommentBatchItem = AddCommentInput & { issueId: string };
