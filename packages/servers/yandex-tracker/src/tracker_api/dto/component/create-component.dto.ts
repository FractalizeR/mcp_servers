/**
 * DTO для создания компонента в очереди Яндекс.Трекера
 *
 * API: POST /v3/queues/{queueId}/components
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
  description?: string | undefined;

  /**
   * ID или login руководителя компонента
   * @example "user-login" или "1234567890"
   */
  lead?: string | undefined;

  /**
   * Автоматическое назначение исполнителя
   *
   * Если true, задачи с этим компонентом будут автоматически
   * назначаться на руководителя компонента.
   *
   * @default false
   */
  assignAuto?: boolean | undefined;

  /** Дополнительные поля */
  [key: string]: unknown;
}
