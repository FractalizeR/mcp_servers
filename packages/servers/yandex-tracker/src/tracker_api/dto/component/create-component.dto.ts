/**
 * DTO для создания компонента в очереди Яндекс.Трекера
 *
 * API: POST /v2/queues/{queueId}/components
 *
 * ВАЖНО:
 * - Компонент создается в контексте конкретной очереди (queueId в URL)
 * - После создания нельзя изменить привязку компонента к очереди
 */
export interface CreateComponentDto {
  /**
   * Название компонента
   * @example "Backend"
   */
  name: string;

  /**
   * Описание компонента
   * @example "Backend services and APIs"
   */
  description?: string;

  /**
   * ID или login руководителя компонента
   * @example "user-login" или "1234567890"
   */
  lead?: string;

  /**
   * Автоматическое назначение исполнителя
   *
   * Если true, задачи с этим компонентом будут автоматически
   * назначаться на руководителя компонента.
   *
   * @default false
   */
  assignAuto?: boolean;

  /** Дополнительные поля */
  [key: string]: unknown;
}
