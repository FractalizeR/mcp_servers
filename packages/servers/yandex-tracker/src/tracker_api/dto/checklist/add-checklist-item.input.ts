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
  checked?: boolean;

  /** ID назначенного лица (опционально) */
  assignee?: string;

  /** Дедлайн в формате ISO 8601 (опционально) */
  deadline?: string;
}
