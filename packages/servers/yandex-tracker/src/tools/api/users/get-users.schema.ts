/**
 * Zod схема для валидации параметров GetUsersTool
 */

import { z } from 'zod';
import {
  FieldsSchema,
  FilteredEntitySchema,
  FieldsReturnedSchema,
  makeBatchErrorItemSchema,
  buildOutputSchema,
} from '#common/schemas/index.js';

export const GetUsersParamsSchema = z.object({
  /** Массив login/uid пользователей (обязательно, минимум 1) */
  userIds: z.array(z.string().min(1)).min(1, 'Нужен минимум один userId'),

  /** Список полей для возврата (обязательно) */
  fields: FieldsSchema,
});

export type GetUsersParams = z.infer<typeof GetUsersParamsSchema>;

export const GetUsersOutputDataSchema = z.object({
  total: z.number(),
  successful: z.number(),
  failed: z.number(),
  users: z.array(
    z.object({
      userId: z.string(),
      user: FilteredEntitySchema,
    })
  ),
  errors: z.array(makeBatchErrorItemSchema('userId')),
  fieldsReturned: FieldsReturnedSchema,
});

export const GetUsersOutputSchema = buildOutputSchema(GetUsersOutputDataSchema);
