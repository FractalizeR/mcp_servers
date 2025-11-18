/**
 * DTO для получения одного проекта в Яндекс.Трекере
 */
export interface GetProjectDto {
  /**
   * Дополнительные поля для включения в ответ
   * @example 'queues' | 'team'
   */
  expand?: string;
}
