/**
 * Zod схема для валидации параметров DeleteEntityTool
 */

import { z } from 'zod';
import { buildOutputSchema } from '#common/schemas/index.js';

export const DeleteEntityParamsSchema = z.object({
  /** Тип записи Entity API — goal/project/portfolio (обязательно) */
  entityType: z.enum(['goal', 'project', 'portfolio']),

  /** Идентификатор записи для удаления (обязательно) */
  entityId: z.string().min(1, 'Entity ID не может быть пустым'),
});

export type DeleteEntityParams = z.infer<typeof DeleteEntityParamsSchema>;

export const DeleteEntityOutputDataSchema = z.object({
  success: z.literal(true),
  entityType: z.enum(['goal', 'project', 'portfolio']),
  entityId: z.string(),
  message: z.string(),
});

export const DeleteEntityOutputSchema = buildOutputSchema(DeleteEntityOutputDataSchema);
