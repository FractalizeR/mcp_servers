/**
 * DTO для получения списка очередей в Яндекс.Трекере
 *
 * ВАЖНО: Поддерживает курсорную пагинацию и expand параметры.
 */
export interface GetQueuesDto {
  /** Количество записей на странице (по умолчанию: 50) */
  perPage?: number | undefined;

  /**
   * Непрозрачный курсор следующей страницы (из `pagination.nextCursor`).
   * Кодирует путь и perPage предыдущего запроса.
   */
  cursor?: string | undefined;

  /**
   * Дополнительные поля для включения в ответ
   * @example 'projects' | 'components' | 'versions'
   */
  expand?: string | undefined;

  /**
   * Если true — обойти все страницы по `Link rel="next"` с защитным лимитом
   * `maxItems`. По умолчанию — одна страница.
   */
  fetchAll?: boolean | undefined;

  /**
   * Максимум записей на одну цепочку обхода при `fetchAll=true`
   * (по умолчанию применяет паджинатор — `DEFAULT_MAX_ITEMS`).
   */
  maxItems?: number | undefined;
}
