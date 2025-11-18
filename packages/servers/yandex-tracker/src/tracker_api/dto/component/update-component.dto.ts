/**
 * DTO для обновления компонента в Яндекс.Трекере
 *
 * API: PATCH /v2/components/{componentId}
 *
 * ВАЖНО:
 * - Все поля опциональны (частичное обновление)
 * - Привязку к очереди нельзя изменить (она задается при создании)
 */
export interface UpdateComponentDto {
  /**
   * Название компонента
   * @example "Backend Services"
   */
  name?: string;

  /**
   * Описание компонента
   * @example "Updated description"
   */
  description?: string;

  /**
   * ID или login руководителя компонента
   * @example "new-lead-login"
   */
  lead?: string;

  /**
   * Автоматическое назначение исполнителя
   */
  assignAuto?: boolean;

  /** Дополнительные поля */
  [key: string]: unknown;
}
