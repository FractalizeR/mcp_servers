/**
 * DTO для получения списка пользователей организации
 */

export interface FindUsersDto {
  /** Размер страницы (опционально) */
  perPage?: number | undefined;

  /** Непрозрачный курсор следующей страницы (опционально) */
  cursor?: string | undefined;

  /** Полный обход всех страниц (опционально) */
  fetchAll?: boolean | undefined;

  /** Лимит записей при fetchAll (опционально) */
  maxItems?: number | undefined;
}
