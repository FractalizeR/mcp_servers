/**
 * DTO для удаления доски
 */

export interface DeleteBoardDto {
  /** ID доски для удаления */
  boardId: string;

  /** Дополнительные параметры */
  [key: string]: unknown;
}
