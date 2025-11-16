/**
 * DTO для обновления задачи в Яндекс.Трекере
 *
 * ВАЖНО: Содержит только known поля для type-safe отправки в API.
 * Используется в UpdateIssueOperation и соответствующих tools.
 */
export interface UpdateIssueDto {
  /** Краткое описание */
  summary?: string;

  /** Подробное описание */
  description?: string;

  /** Исполнитель (логин или UID) */
  assignee?: string;

  /** Приоритет (ключ приоритета) */
  priority?: string;

  /** Тип задачи (ключ типа) */
  type?: string;

  /** Статус (ключ статуса) */
  status?: string;

  /** Дополнительные поля (для кастомных полей Трекера) */
  [key: string]: unknown;
}
