/**
 * Позиция вставки
 */
export type InsertLocation = 'top' | 'bottom';

/**
 * DTO для добавления контента
 */
export interface AppendContentDto {
  /** Контент для добавления (обязательно) */
  content: string;

  /** Вставка в тело страницы */
  body?: {
    location: InsertLocation;
  };

  /** Вставка в секцию */
  section?: {
    id: number;
    location: InsertLocation;
  };

  /** Вставка по якорю */
  anchor?: {
    name: string;
    fallback?: boolean;
    regex?: boolean;
  };
}
