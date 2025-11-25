/**
 * DTO для клонирования страницы
 */
export interface ClonePageDto {
  /** Целевой slug (обязательно) */
  target: string;

  /** Название копии (1-255 символов) */
  title?: string;

  /** Подписаться на изменения */
  subscribe_me?: boolean;
}
