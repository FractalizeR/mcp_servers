/**
 * DTO для параметров поиска задач в Яндекс.Трекере
 *
 * ВАЖНО: Используется для передачи параметров фильтрации в API.
 * Все поля опциональны.
 */
export interface SearchIssuesDto {
  /** Очередь */
  queue?: string;

  /** Статус */
  status?: string;

  /** Исполнитель */
  assignee?: string;

  /** Автор */
  createdBy?: string;

  /** Приоритет */
  priority?: string;

  /** Текст для поиска */
  query?: string;

  /** Дополнительные фильтры */
  [key: string]: unknown;
}
