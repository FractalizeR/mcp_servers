/**
 * DTO для обновления элемента чеклиста
 *
 * Используется в UpdateChecklistItemOperation и yandex_tracker_update_checklist_item tool.
 *
 * API: PATCH /v2/issues/{issueId}/checklistItems/{checklistId}
 *
 * Все поля опциональны (partial update)
 */
export interface UpdateChecklistItemInput {
  /** Текст элемента чеклиста */
  text?: string;

  /** Статус выполнения элемента */
  checked?: boolean;

  /** ID назначенного лица */
  assignee?: string;

  /** Дедлайн в формате ISO 8601 */
  deadline?: string;
}
