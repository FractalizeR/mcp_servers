/**
 * DTO для получения спринтов доски
 */

export interface GetSprintsDto {
  /** ID доски, для которой получаем спринты */
  boardId: string;

  /** Дополнительные параметры */
  [key: string]: unknown;
}
