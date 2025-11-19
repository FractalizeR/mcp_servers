/**
 * DTO для получения доски по ID
 */

export interface GetBoardDto {
  /** ID доски */
  boardId: string;

  /**
   * Локализация полей
   * @default true
   */
  localized?: boolean | undefined;

  /** Дополнительные параметры */
  [key: string]: unknown;
}
