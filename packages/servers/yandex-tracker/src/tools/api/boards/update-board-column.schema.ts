/**
 * Zod схема для валидации параметров UpdateBoardColumnTool
 */

import { z } from 'zod';
import {
  FieldsSchema,
  FilteredEntitySchema,
  FieldsReturnedSchema,
  buildOutputSchema,
} from '#common/schemas/index.js';

export const UpdateBoardColumnParamsSchema = z.object({
  /** Идентификатор доски (обязательно) */
  boardId: z.string().min(1, 'Board ID не может быть пустым'),

  /** Идентификатор колонки (обязательно) */
  columnId: z.string().min(1, 'Column ID не может быть пустым'),

  /** Новое название колонки (опционально) */
  name: z.string().min(1).optional(),

  /** Новый список ключей статусов (опционально) */
  statuses: z.array(z.string().min(1)).optional(),

  /** Лимит задач в колонке — WIP-лимит (опционально) */
  limit: z.number().int().nonnegative().optional(),

  /** Список полей для возврата (обязательно) */
  fields: FieldsSchema,
});

export type UpdateBoardColumnParams = z.infer<typeof UpdateBoardColumnParamsSchema>;

export const UpdateBoardColumnOutputDataSchema = z.object({
  column: FilteredEntitySchema,
  fieldsReturned: FieldsReturnedSchema,
});

export const UpdateBoardColumnOutputSchema = buildOutputSchema(UpdateBoardColumnOutputDataSchema);
