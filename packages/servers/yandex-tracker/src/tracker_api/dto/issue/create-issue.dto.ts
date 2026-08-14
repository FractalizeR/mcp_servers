/**
 * DTO для создания задачи в Яндекс.Трекере
 *
 * ВАЖНО: Содержит только known поля для type-safe отправки в API.
 * Используется в UpdateIssueOperation и соответствующих tools.
 */
export interface CreateIssueDto {
  /** Ключ очереди (обязательно) */
  queue: string;

  /** Краткое описание (обязательно) */
  summary: string;

  /** Подробное описание */
  description?: string | undefined;

  /** Исполнитель (логин или UID) */
  assignee?: string | undefined;

  /** Приоритет (ключ приоритета) */
  priority?: string | undefined;

  /** Тип задачи (ключ типа) */
  type?: string | undefined;

  /**
   * Ключ идемпотентности создания задачи.
   *
   * Если не передан — `CreateIssueOperation` генерирует его сам (аналогично
   * референсному Python-клиенту: `uuid4().hex`) и отправляет транспорту с
   * `idempotencyDeclared: true`. Трекер учитывает `unique` при повторном
   * создании с тем же значением: вместо второй задачи возвращает конфликт
   * (409), по которому операция находит и возвращает уже созданную задачу —
   * это и делает POST /v3/issues безопасным для retry (см. пакет 1.1.C).
   */
  unique?: string | undefined;

  /** Дополнительные поля (для кастомных полей Трекера) */
  [key: string]: unknown;
}
