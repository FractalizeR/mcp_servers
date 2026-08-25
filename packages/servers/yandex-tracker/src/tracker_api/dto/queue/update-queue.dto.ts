/**
 * DTO для обновления очереди в Яндекс.Трекере
 *
 * ВАЖНО: Все поля опциональны (Partial от CreateQueueDto).
 */
export interface UpdateQueueDto {
  /** Название очереди */
  name?: string | undefined;

  /** ID или login руководителя очереди */
  lead?: string | undefined;

  /** ID типа задачи по умолчанию */
  defaultType?: string | undefined;

  /** ID приоритета по умолчанию */
  defaultPriority?: string | undefined;

  /** Описание очереди */
  description?: string | undefined;

  /** Дополнительные поля */
  [key: string]: unknown;
}
