/**
 * DTO для добавления элемента в чеклист задачи
 *
 * Используется в AddChecklistItemOperation и yandex_tracker_add_checklist_item tool.
 *
 * API: POST /v2/issues/{issueId}/checklistItems
 */
export interface AddChecklistItemInput {
  /** Текст элемента чеклиста (обязательно) */
  text: string;

  /** Статус выполнения элемента (опционально, по умолчанию false) */
  checked?: boolean | undefined;

  /** ID назначенного лица (опционально) */
  assignee?: string | undefined;

  /**
   * Дедлайн: `YYYY-MM-DD` или полный ISO 8601 (опционально). Оборачивается в
   * `{date, deadlineType: 'date'}` в `buildChecklistItemBody()` на границе
   * с API — см. `checklist-item-body.util.ts`.
   */
  deadline?: string | undefined;
}
