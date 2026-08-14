/**
 * Zod схема для валидации параметров GetGlobalFieldTool
 */

import { z } from 'zod';
import {
  FieldsSchema,
  FilteredEntitySchema,
  FieldsReturnedSchema,
  buildOutputSchema,
} from '#common/schemas/index.js';

export const GetGlobalFieldParamsSchema = z.object({
  /** Идентификатор глобального поля (обязательно), например 'summary' или 'customField123' */
  fieldId: z.string().min(1, 'Field ID не может быть пустым'),

  /** Список полей для возврата (обязательно) */
  fields: FieldsSchema,
});

export type GetGlobalFieldParams = z.infer<typeof GetGlobalFieldParamsSchema>;

export const GetGlobalFieldOutputDataSchema = z.object({
  globalField: FilteredEntitySchema,
  fieldsReturned: FieldsReturnedSchema,
});

export const GetGlobalFieldOutputSchema = buildOutputSchema(GetGlobalFieldOutputDataSchema);
