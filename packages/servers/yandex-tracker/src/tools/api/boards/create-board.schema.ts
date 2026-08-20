/**
 * Zod схема для валидации параметров CreateBoardTool
 */

import { z } from 'zod';
import { FieldsSchema, FilteredEntitySchema, buildOutputSchema } from '#common/schemas/index.js';

/**
 * Колонка доски при создании
 */
const CreateBoardColumnSchema = z.object({
  name: z.string().min(1, 'Название колонки обязательно'),
  statuses: z.array(z.string().min(1)).min(1, 'Нужен минимум один статус'),
});

/**
 * Фильтр доски при создании
 */
const CreateBoardFilterSchema = z.object({
  query: z.string().optional(),
});

/**
 * Схема параметров для создания доски
 */
export const CreateBoardParamsSchema = z.object({
  /** Название доски (обязательно) */
  name: z.string().min(1, 'Название доски обязательно'),

  /** ID очереди, для которой создаётся доска (опционально) */
  queue: z.string().optional(),

  /** Колонки доски (опционально) */
  columns: z.array(CreateBoardColumnSchema).optional(),

  /** Фильтр доски (опционально) */
  filter: CreateBoardFilterSchema.optional(),

  /** Поле для сортировки задач (опционально) */
  orderBy: z.string().optional(),

  /** Порядок сортировки: true = возрастание (опционально) */
  orderAsc: z.boolean().optional(),

  /** Query string для дополнительной фильтрации (опционально) */
  query: z.string().optional(),

  /** Использовать ранжирование задач (опционально) */
  useRanking: z.boolean().optional(),

  /** ID страны для региональных настроек (опционально) */
  country: z.string().optional(),

  /** Список полей для возврата (обязательный) */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type CreateBoardParams = z.infer<typeof CreateBoardParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const CreateBoardOutputDataSchema = z.object({
  board: FilteredEntitySchema,
  message: z.string(),
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const CreateBoardOutputSchema = buildOutputSchema(CreateBoardOutputDataSchema);
