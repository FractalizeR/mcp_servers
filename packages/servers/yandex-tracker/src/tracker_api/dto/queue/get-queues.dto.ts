/**
 * DTO для получения списка очередей в Яндекс.Трекере
 *
 * ВАЖНО: Поддерживает пагинацию и expand параметры.
 */
export interface GetQueuesDto {
  /** Количество записей на странице (по умолчанию: 50) */
  perPage?: number;

  /** Номер страницы (начинается с 1) */
  page?: number;

  /**
   * Дополнительные поля для включения в ответ
   * @example 'projects' | 'components' | 'versions'
   */
  expand?: string;
}
