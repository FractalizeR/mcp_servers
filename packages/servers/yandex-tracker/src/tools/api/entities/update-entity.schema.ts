/**
 * Zod схема для валидации параметров UpdateEntityTool
 */

import { z } from 'zod';
import {
  FieldsSchema,
  FilteredEntitySchema,
  FieldsReturnedSchema,
  buildOutputSchema,
} from '#common/schemas/index.js';

export const UpdateEntityParamsSchema = z.object({
  /** Тип записи Entity API — goal/project/portfolio (обязательно) */
  entityType: z.enum(['goal', 'project', 'portfolio']),

  /** Идентификатор записи (обязательно) */
  entityId: z.string().min(1, 'Entity ID не может быть пустым'),

  /** Версия записи для оптимистичной блокировки (опционально) */
  version: z.number().int().positive().optional(),

  /**
   * Кастомные поля записи (отправляются в тело `{ fields: {...} }`).
   * Поля `name`/`description` в Entity API НЕ существуют.
   */
  extraFields: z.record(z.string(), z.unknown()).optional(),

  /** Список полей для возврата (обязательно) */
  fields: FieldsSchema,
});

export type UpdateEntityParams = z.infer<typeof UpdateEntityParamsSchema>;

export const UpdateEntityOutputDataSchema = z.object({
  entity: FilteredEntitySchema,
  fieldsReturned: FieldsReturnedSchema,
});

export const UpdateEntityOutputSchema = buildOutputSchema(UpdateEntityOutputDataSchema);
