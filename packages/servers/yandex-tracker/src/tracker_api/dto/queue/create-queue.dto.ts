/**
 * Конфигурация одного типа задачи в теле создания очереди (`POST /v3/queues/`).
 *
 * Форма запроса отличается от формы ответа (`QueueIssueTypeConfig`): API принимает
 * плоские идентификаторы/ключи строками, а не вложенные `{ id }`-рефы.
 */
export interface CreateQueueIssueTypeConfigDto {
  /** ID типа задачи (справочник — `get_issue_types`) */
  issueType: string;

  /** ID воркфлоу организации (справочник — `raw_api_request GET /v3/workflows`) */
  workflow: string;

  /** Ключи возможных резолюций (справочник — `get_resolutions`) */
  resolutions: string[];
}

/**
 * DTO для создания очереди в Яндекс.Трекере
 *
 * ВАЖНО: Ключ очереди должен соответствовать регулярному выражению ^[A-Z]{2,10}$
 */
export interface CreateQueueDto {
  /** Уникальный ключ очереди (только заглавные буквы A-Z, 2-10 символов) */
  key: string;

  /** Название очереди */
  name: string;

  /** ID или login руководителя очереди */
  lead: string;

  /** ID типа задачи по умолчанию */
  defaultType: string;

  /** ID приоритета по умолчанию */
  defaultPriority: string;

  /** Конфигурация воркфлоу и резолюций по типам задач (обязательна для API) */
  issueTypesConfig: CreateQueueIssueTypeConfigDto[];

  /** Описание очереди */
  description?: string | undefined;

  /** Массив ID доступных типов задач */
  issueTypes?: string[] | undefined;

  /** Дополнительные поля */
  [key: string]: unknown;
}
