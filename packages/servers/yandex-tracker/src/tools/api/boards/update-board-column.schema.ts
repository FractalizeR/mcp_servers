/**
 * Zod схема для валидации параметров UpdateBoardColumnTool
 */

import { z } from 'zod';
import {
  FieldsSchema,
  FilteredEntitySchema,
  buildOutputSchema,
  buildEntityIdSchema,
} from '#common/schemas/index.js';

export const UpdateBoardColumnParamsSchema = z.object({
  /** Идентификатор доски (обязательно) */
  boardId: buildEntityIdSchema('Board'),

  /** Идентификатор колонки (обязательно) */
  columnId: buildEntityIdSchema('Column'),

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
});

export const UpdateBoardColumnOutputSchema = buildOutputSchema(UpdateBoardColumnOutputDataSchema);
