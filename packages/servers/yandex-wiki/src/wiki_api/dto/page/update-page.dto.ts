/**
 * DTO для обновления страницы
 */
export interface UpdatePageDto {
  /** Новое название (1-255 символов) */
  title?: string;

  /** Новое содержимое */
  content?: string;

  /** Redirect на другую страницу */
  redirect?: {
    page: {
      id?: number;
      slug?: string;
    };
  };
}
