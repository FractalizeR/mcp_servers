/**
 * DTO для правила сортировки сохранённого фильтра
 */

export interface FilterSortDto {
  /** Поле сортировки */
  field: string;

  /** Направление сортировки: true = по возрастанию */
  isAscending: boolean;
}
