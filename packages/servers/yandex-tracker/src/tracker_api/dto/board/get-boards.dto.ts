/**
 * DTO для получения списка досок
 */

export interface GetBoardsDto {
  /**
   * Локализация полей
   * @default true
   */
  localized?: boolean | undefined;

  /** Дополнительные параметры */
  [key: string]: unknown;
}
