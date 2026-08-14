/**
 * Zod схема для валидации параметров UpdateBoardTool
 */

import { z } from 'zod';
import {
  FieldsSchema,
  FilteredEntitySchema,
  FieldsReturnedSchema,
  buildOutputSchema,
} from '#common/schemas/index.js';

const UpdateBoardColumnSchema = z.object({
  name: z.string().min(1, 'Название колонки обязательно'),
  statuses: z.array(z.string().min(1)).min(1, 'Нужен минимум один статус'),
});

const UpdateBoardFilterSchema = z.object({
  query: z.string().optional(),
});

/**
 * Схема параметров для обновления доски
 */
export const UpdateBoardParamsSchema = z.object({
  /** Идентификатор доски (обязательно) */
  boardId: z.string().min(1, 'Board ID не может быть пустым'),

  /** Новое название доски (опционально) */
  name: z.string().min(1).optional(),

  /** Версия доски для оптимистичной блокировки (опционально) */
  version: z.number().int().positive().optional(),

  /** Обновлённые колонки доски (опционально) */
  columns: z.array(UpdateBoardColumnSchema).optional(),

  /** Обновлённый фильтр доски (опционально) */
  filter: UpdateBoardFilterSchema.optional(),

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
export type UpdateBoardParams = z.infer<typeof UpdateBoardParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const UpdateBoardOutputDataSchema = z.object({
  board: FilteredEntitySchema,
  fieldsReturned: FieldsReturnedSchema,
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const UpdateBoardOutputSchema = buildOutputSchema(UpdateBoardOutputDataSchema);
