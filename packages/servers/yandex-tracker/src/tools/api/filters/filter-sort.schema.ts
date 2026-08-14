/**
 * Общая Zod схема правила сортировки для create/update filter инструментов
 */

import { z } from 'zod';

export const FilterSortInputSchema = z.object({
  /** Поле сортировки */
  field: z.string().min(1),

  /** Направление сортировки: true = по возрастанию */
  isAscending: z.boolean(),
});
