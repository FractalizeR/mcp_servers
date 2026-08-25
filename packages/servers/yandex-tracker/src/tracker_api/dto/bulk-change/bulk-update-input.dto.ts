/**
 * DTO для массового обновления задач
 *
 * API: POST /v3/bulkchange/_update
 *
 * Позволяет обновить одно или несколько полей у множества задач одновременно.
 * Операция выполняется асинхронно на сервере.
 */

/**
 * Входные параметры для массового обновления задач
 *
 * ВАЖНО:
 * - issues: массив ключей задач для обновления (например, ['QUEUE-1', 'QUEUE-2'])
 * - values: объект с обновляемыми полями (например, {priority: 'minor', tags: {add: ['bug']}})
 * - Все поля в values опциональны (partial update)
 * - Поддерживаются кастомные поля через index signature
 */
export interface BulkUpdateIssuesInputDto {
  /** Массив ключей задач для обновления */
  readonly issues: string[];

  /**
   * Обновляемые поля
   *
   * Примеры:
   * - summary: 'Новое название'
   * - description: 'Новое описание'
   * - priority: 'minor'
   * - assignee: 'username'
   * - tags: {add: ['bug', 'critical'], remove: ['feature']}
   * - customField: 'значение'
   */
  readonly values: {
    /** Название задачи */
    readonly summary?: string;

    /** Описание задачи */
    readonly description?: string;

    /** Приоритет задачи */
    readonly priority?: string;

    /** Исполнитель (логин пользователя) */
    readonly assignee?: string;

    /** Тип задачи */
    readonly type?: string;

    /** Теги (можно добавлять и удалять) */
    readonly tags?: {
      readonly add?: string[];
      readonly remove?: string[];
    };

    /** Компоненты */
    readonly components?: number[];

    /** Версии */
    readonly versions?: number[];

    /** Дата начала (ISO 8601) */
    readonly start?: string;

    /** Дедлайн (ISO 8601) */
    readonly end?: string;

    /** Индекс-сигнатура для кастомных полей */
    readonly [key: string]: unknown;
  };
}
