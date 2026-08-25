/**
 * DTO для обновления компонента в Яндекс.Трекере
 *
 * API: PATCH /v3/components/{componentId}
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
  name?: string | undefined;

  /**
   * Описание компонента
   * @example "Updated description"
   */
  description?: string | undefined;

  /**
   * ID или login руководителя компонента
   * @example "new-lead-login"
   */
  lead?: string | undefined;

  /**
   * Автоматическое назначение исполнителя
   */
  assignAuto?: boolean | undefined;

  /** Дополнительные поля */
  [key: string]: unknown;
}
