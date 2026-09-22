/**
 * Zod схема для валидации параметров UpdateEntityTool
 */

import { z } from 'zod';
import { buildOptimisticLockDescription } from '@fractalizer/mcp-core';
import { FieldsSchema, FilteredEntitySchema, buildOutputSchema } from '#common/schemas/index.js';

export const UpdateEntityParamsSchema = z.object({
  /** Тип записи Entity API — goal/project/portfolio (обязательно) */
  entityType: z.enum(['goal', 'project', 'portfolio']),

  /** Идентификатор записи (обязательно) */
  entityId: z.string().min(1, 'Entity ID не может быть пустым'),

  /** Версия записи для оптимистичной блокировки (опционально) */
  version: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      buildOptimisticLockDescription({
        paramName: 'version',
        source: 'в ответе get_entity/find_entities (запроси его в fields)',
        // Entity API (`/v3/entities/`) живьём не наблюдался ни разу, и вывести
        // исход по соседям нельзя: это отдельный API со своей семантикой.
        conflict: 'unspecified',
      })
    ),

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
});

export const UpdateEntityOutputSchema = buildOutputSchema(UpdateEntityOutputDataSchema);
