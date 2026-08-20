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
  fields: FieldsSchema.describe(
    'Список полей для возврата (ОБЯЗАТЕЛЬНЫЙ). Содержательные поля записи запрашиваются как ' +
      '"fields.<имя>", где имя — реальный идентификатор поля Трекера (см. get_global_fields): ' +
      'например "fields.summary". Несуществующее имя API отклоняет целиком (422), а проекция ' +
      '"fields" без имени не поддерживается — Entity API не умеет отдавать все поля разом.'
  ),
});

export type GetEntityParams = z.infer<typeof GetEntityParamsSchema>;

export const GetEntityOutputDataSchema = z.object({
  entity: FilteredEntitySchema,
  fieldsReturned: FieldsReturnedSchema,
});

export const GetEntityOutputSchema = buildOutputSchema(GetEntityOutputDataSchema);
