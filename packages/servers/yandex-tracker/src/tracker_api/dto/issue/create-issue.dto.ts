/**
 * DTO для создания задачи в Яндекс.Трекере
 *
 * ВАЖНО: Содержит только known поля для type-safe отправки в API.
 * Используется в UpdateIssueOperation и соответствующих tools.
 */
export interface CreateIssueDto {
  /** Ключ очереди (обязательно) */
  queue: string;

  /** Краткое описание (обязательно) */
  summary: string;

  /** Подробное описание */
  description?: string;

  /** Исполнитель (логин или UID) */
  assignee?: string;

  /** Приоритет (ключ приоритета) */
  priority?: string;

  /** Тип задачи (ключ типа) */
  type?: string;

  /** Дополнительные поля (для кастомных полей Трекера) */
  [key: string]: unknown;
}
