/**
 * DTO для массовой смены статусов задач
 *
 * API: POST /v3/bulkchange/_transition
 *
 * Позволяет перевести множество задач в новый статус одновременно.
 * Операция выполняется асинхронно на сервере.
 */

/**
 * Входные параметры для массовой смены статусов
 *
 * ВАЖНО:
 * - issues: массив ключей задач для перевода
 * - transition: ID или ключ перехода (например, 'start_progress', 'close')
 * - values: опциональные поля для обновления при переходе
 *
 * Примеры:
 * - Простой переход: {issues: ['TEST-1'], transition: 'start_progress'}
 * - С установкой резолюции: {issues: ['TEST-1'], transition: 'close', values: {resolution: 'fixed'}}
 */
export interface BulkTransitionIssuesInputDto {
  /** Массив ключей задач для перевода */
  readonly issues: string[];

  /**
   * ID или ключ перехода
   *
   * Примеры:
   * - 'start_progress' - начать работу
   * - 'need_info' - требуется информация
   * - 'close' - закрыть задачу
   * - 'reopen' - переоткрыть
   */
  readonly transition: string;

  /**
   * Опциональные поля для обновления при переходе
   *
   * Используется когда переход требует установки дополнительных полей.
   * Например, при закрытии задачи может требоваться установка resolution.
   */
  readonly values?: {
    /** Резолюция (для перехода в статус "Закрыт") */
    readonly resolution?: string;

    /** Комментарий к переходу */
    readonly comment?: string;

    /** Исполнитель */
    readonly assignee?: string;

    /** Приоритет */
    readonly priority?: string;

    /** Индекс-сигнатура для других полей */
    readonly [key: string]: unknown;
  };
}
