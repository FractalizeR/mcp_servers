/**
 * DTO для обновления ячеек
 */
export interface UpdateCellsDto {
  /** Ревизия */
  revision?: string;

  /** Ячейки для обновления (обязательно) */
  cells: Array<{
    row_id: string;
    column_slug: string;
    value: unknown;
  }>;
}
