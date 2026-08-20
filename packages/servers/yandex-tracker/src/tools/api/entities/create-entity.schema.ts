/**
 * Zod схема для валидации параметров CreateEntityTool
 *
 * См. примечание о неполной документированности тела запроса в
 * `#tracker_api/dto/entity-api/create-entity.dto.js`.
 */

import { z } from 'zod';
import { FieldsSchema, FilteredEntitySchema, buildOutputSchema } from '#common/schemas/index.js';

export const CreateEntityParamsSchema = z.object({
  /** Тип создаваемой записи Entity API — goal/project/portfolio (обязательно) */
  entityType: z.enum(['goal', 'project', 'portfolio']),

  /**
   * Кастомные поля записи (отправляются в тело `{ fields: {...} }`).
   * Поле `summary` (строка) — обязательное для всех entityType. `name`/`description`
   * в Entity API НЕ существуют (422 «поля [name] не существуют»).
   */
  extraFields: z
    .record(z.string(), z.unknown())
    .describe('Кастомные поля записи Entity API; обязательно поле summary (строка)'),

  /** Список полей для возврата (обязательно) */
  fields: FieldsSchema,
});

export type CreateEntityParams = z.infer<typeof CreateEntityParamsSchema>;

export const CreateEntityOutputDataSchema = z.object({
  entity: FilteredEntitySchema,
  message: z.string(),
});

export const CreateEntityOutputSchema = buildOutputSchema(CreateEntityOutputDataSchema);
