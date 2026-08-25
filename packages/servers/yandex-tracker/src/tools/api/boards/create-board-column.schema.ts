/**
 * Zod схема для валидации параметров CreateBoardColumnTool
 */

import { z } from 'zod';
import {
  FieldsSchema,
  FilteredEntitySchema,
  buildOutputSchema,
  buildEntityIdSchema,
} from '#common/schemas/index.js';

export const CreateBoardColumnParamsSchema = z.object({
  /** Идентификатор доски (обязательно) */
  boardId: buildEntityIdSchema('Board'),

  /** Название колонки (обязательно) */
  name: z.string().min(1, 'Название колонки обязательно'),

  /** Ключи статусов, входящих в колонку (обязательно, минимум 1) */
  statuses: z.array(z.string().min(1)).min(1, 'Нужен минимум один статус'),

  /** Список полей для возврата (обязательно) */
  fields: FieldsSchema,
});

export type CreateBoardColumnParams = z.infer<typeof CreateBoardColumnParamsSchema>;

export const CreateBoardColumnOutputDataSchema = z.object({
  column: FilteredEntitySchema,
  message: z.string(),
});

export const CreateBoardColumnOutputSchema = buildOutputSchema(CreateBoardColumnOutputDataSchema);
