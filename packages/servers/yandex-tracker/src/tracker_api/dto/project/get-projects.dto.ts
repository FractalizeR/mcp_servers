/**
 * DTO для получения списка проектов в Яндекс.Трекере
 *
 * ВАЖНО: Поддерживает пагинацию и expand параметры.
 */
export interface GetProjectsDto {
  /** Количество записей на странице (по умолчанию: 50) */
  perPage?: number | undefined;

  /** Номер страницы (начинается с 1) */
  page?: number | undefined;

  /**
   * Дополнительные поля для включения в ответ
   * @example 'queues' | 'team'
   */
  expand?: string | undefined;

  /**
   * Фильтр по ID очереди (вернет проекты, связанные с этой очередью)
   */
  queueId?: string | undefined;

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
