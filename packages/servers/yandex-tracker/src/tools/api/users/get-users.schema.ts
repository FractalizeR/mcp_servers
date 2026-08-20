/**
 * Zod схема для валидации параметров GetUsersTool
 */

import { z } from 'zod';
import {
  FieldsSchema,
  FilteredEntitySchema,
  makeBatchResultSchema,
  buildOutputSchema,
} from '#common/schemas/index.js';

export const GetUsersParamsSchema = z.object({
  /** Массив login/uid пользователей (обязательно, минимум 1) */
  userIds: z.array(z.string().min(1)).min(1, 'Нужен минимум один userId'),

  /** Список полей для возврата (обязательно) */
  fields: FieldsSchema,
});

export type GetUsersParams = z.infer<typeof GetUsersParamsSchema>;

/**
 * Канон batch-ответа (`total`/`successful[]`/`failed[]`, план
 * `plan_tool_contract_unification`, 1.1 п.4): `successful`/`failed` — массивы,
 * не счётчики (раньше здесь были `z.number()`).
 */
export const GetUsersOutputDataSchema = makeBatchResultSchema(
  'userId',
  z.object({ user: FilteredEntitySchema })
);

export const GetUsersOutputSchema = buildOutputSchema(GetUsersOutputDataSchema);
