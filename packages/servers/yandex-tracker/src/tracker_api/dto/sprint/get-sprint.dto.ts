/**
 * DTO для получения спринта по ID
 */

export interface GetSprintDto {
  /** ID спринта */
  sprintId: string;

  /** Дополнительные параметры */
  [key: string]: unknown;
}
