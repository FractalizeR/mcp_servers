/**
 * Zod схема для валидации параметров CreateEntityTool
 *
 * См. примечание о неполной документированности тела запроса в
 * `#tracker_api/dto/entity-api/create-entity.dto.js`.
 */

import { z } from 'zod';
import {
  FieldsSchema,
  FilteredEntitySchema,
  FieldsReturnedSchema,
  buildOutputSchema,
} from '#common/schemas/index.js';

export const CreateEntityParamsSchema = z.object({
  /** Тип создаваемой записи Entity API — goal/project/portfolio (обязательно) */
  entityType: z.enum(['goal', 'project', 'portfolio']),

  /** Название записи (обязательно) */
  name: z.string().min(1, 'Название записи обязательно'),

  /** Описание записи (опционально) */
  description: z.string().optional(),

  /**
   * Дополнительные поля тела запроса, специфичные для entityType
   * (например `parentEntity`/`teamUsers`/`author`) — форма НЕ зафиксирована
   * ни официальной документацией, ни референсным клиентом (см. DTO),
   * передаются как есть.
   */
  extraFields: z.record(z.string(), z.unknown()).optional(),

  /** Список полей для возврата (обязательно) */
  fields: FieldsSchema,
});

export type CreateEntityParams = z.infer<typeof CreateEntityParamsSchema>;

export const CreateEntityOutputDataSchema = z.object({
  entity: FilteredEntitySchema,
  message: z.string(),
  fieldsReturned: FieldsReturnedSchema,
});

export const CreateEntityOutputSchema = buildOutputSchema(CreateEntityOutputDataSchema);
