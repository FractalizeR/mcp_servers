/**
 * Input DTO для поиска задач через API v3 /issues/_search
 *
 * Документация: https://yandex.ru/support/tracker/ru/concepts/issues/search-issues
 *
 * ВАЖНО: Поддерживаются 4 способа поиска (взаимоисключающие):
 * 1. query - язык запросов Трекера
 * 2. filter - объект с фильтрами по полям
 * 3. keys - список ключей задач
 * 4. queue - поиск по очереди
 */
export interface FindIssuesInputDto {
  /**
   * Язык запросов Яндекс.Трекера
   *
   * Примеры:
   * - "Author: me() Resolution: empty()"
   * - "Assignee: me() Deadline: week()"
   * - "(Followers: me() OR Assignee: me()) AND Resolution: empty()"
   *
   * Операторы: AND, OR, NOT, скобки
   * Функции: empty(), notEmpty(), me(), now(), today(), week(), month()
   * Сравнение: >, <, >=, <=, !, #, ~
   */
  query?: string;

  /**
   * Фильтр по полям задачи (объект key-value)
   *
   * Примеры:
   * - { queue: "PROJ", status: "open" }
   * - { assignee: "user@example.com", priority: "critical" }
   *
   * ВАЖНО: Можно использовать функции empty(), notEmpty() как значения
   */
  filter?: Record<string, unknown>;

  /**
   * Список ключей задач для поиска
   *
   * Пример: ["PROJ-1", "PROJ-2", "QUEUE-123"]
   *
   * ВАЖНО: Для batch-получения лучше использовать getIssues() из GetIssuesOperation
   */
  keys?: string[];

  /**
   * Ключ очереди для поиска всех задач в очереди
   *
   * Пример: "DEVOPS"
   */
  queue?: string;

  /**
   * Фильтр по ID (альтернатива filterId из API)
   *
   * ID сохранённого фильтра в Трекере
   */
  filterId?: string;

  /**
   * Сортировка результатов
   *
   * Формат: ["+field1", "-field2"] где:
   * - "+" или отсутствие префикса = ASC
   * - "-" = DESC
   *
   * Примеры:
   * - ["+created"] - сортировка по дате создания (возрастание)
   * - ["-priority", "+status"] - по приоритету (убывание), потом по статусу (возрастание)
   *
   * ВАЖНО: Работает только с filter, не с query
   */
  order?: string[];

  /**
   * Количество результатов на странице
   *
   * По умолчанию: 50
   * Максимум: зависит от сервера (обычно несколько сотен)
   */
  perPage?: number;

  /**
   * Номер страницы для пагинации
   *
   * ВАЖНО: Для >10000 результатов используй scroll (не реализовано в v1)
   */
  page?: number;

  /**
   * Расширение ответа дополнительными полями
   *
   * Возможные значения:
   * - "transitions" - доступные переходы по workflow
   * - "attachments" - вложения задачи
   *
   * Пример: ["transitions", "attachments"]
   */
  expand?: string[];
}
