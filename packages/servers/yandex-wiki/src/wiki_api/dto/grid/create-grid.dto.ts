/**
 * DTO для создания таблицы
 */
export interface CreateGridDto {
  /** Название таблицы (1-255 символов, обязательно) */
  title: string;

  /** Страница для таблицы (обязательно) */
  page: {
    id?: number;
    slug?: string;
  };
}
