/**
 * DTO для получения одной очереди в Яндекс.Трекере
 */
export interface GetQueueDto {
  /** Идентификатор или ключ очереди */
  queueId: string;

  /**
   * Дополнительные поля для включения в ответ
   * @example 'projects' | 'components' | 'versions'
   */
  expand?: string;
}
