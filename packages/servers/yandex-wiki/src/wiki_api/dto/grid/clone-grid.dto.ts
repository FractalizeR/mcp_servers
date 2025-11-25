/**
 * DTO для клонирования таблицы
 */
export interface CloneGridDto {
  /** Целевой slug страницы (обязательно) */
  target: string;

  /** Название копии (1-255 символов) */
  title?: string;

  /** Копировать с данными */
  with_data?: boolean;
}
