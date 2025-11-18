/**
 * DTO для обновления очереди в Яндекс.Трекере
 *
 * ВАЖНО: Все поля опциональны (Partial от CreateQueueDto).
 */
export interface UpdateQueueDto {
  /** Название очереди */
  name?: string;

  /** ID или login руководителя очереди */
  lead?: string;

  /** ID типа задачи по умолчанию */
  defaultType?: string;

  /** ID приоритета по умолчанию */
  defaultPriority?: string;

  /** Описание очереди */
  description?: string;

  /** Массив ID доступных типов задач */
  issueTypes?: string[];

  /** Дополнительные поля */
  [key: string]: unknown;
}
