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

  /** Описание очереди */
  description?: string;

  /** Массив ID доступных типов задач */
  issueTypes?: string[];

  /** Дополнительные поля */
  [key: string]: unknown;
}
