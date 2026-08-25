/**
 * DTO для создания компонента в Яндекс.Трекере
 *
 * API: POST /v3/components
 *
 * ВАЖНО:
 * - Очередь передаётся ключом в теле запроса (`queue`), а не в пути
 * - После создания нельзя изменить привязку компонента к очереди
 */
export interface CreateComponentDto {
  /**
   * Название компонента
   * @example "Backend"
   */
  name: string;

  /**
   * Ключ очереди (не ID), которой принадлежит компонент
   * @example "QUEUE"
   */
  queue: string;

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
