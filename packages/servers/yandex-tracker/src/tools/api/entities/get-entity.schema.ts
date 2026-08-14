/**
 * Zod схема для валидации параметров GetEntityTool
 */

import { z } from 'zod';
import {
  FieldsSchema,
  FilteredEntitySchema,
  FieldsReturnedSchema,
  buildOutputSchema,
} from '#common/schemas/index.js';

export const GetEntityParamsSchema = z.object({
  /** Тип записи Entity API — goal/project/portfolio (обязательно) */
  entityType: z.enum(['goal', 'project', 'portfolio']),

  /** Идентификатор записи (обязательно) */
  entityId: z.string().min(1, 'Entity ID не может быть пустым'),

  /** Список полей для возврата (обязательно) */
  fields: FieldsSchema,
});

export type GetEntityParams = z.infer<typeof GetEntityParamsSchema>;

export const GetEntityOutputDataSchema = z.object({
  entity: FilteredEntitySchema,
  fieldsReturned: FieldsReturnedSchema,
});

export const GetEntityOutputSchema = buildOutputSchema(GetEntityOutputDataSchema);
