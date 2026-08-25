/**
 * Zod схема для валидации параметров CreateSprintTool
 */

import { z } from 'zod';
import {
  FieldsSchema,
  FilteredEntitySchema,
  buildOutputSchema,
  buildEntityIdSchema,
} from '#common/schemas/index.js';

const SprintStatusSchema = z.enum(['draft', 'in_progress', 'released']);

/**
 * Схема параметров для создания спринта
 */
export const CreateSprintParamsSchema = z.object({
  /** Название спринта (обязательно) */
  name: z.string().min(1, 'Название спринта обязательно'),

  /** ID доски, к которой относится спринт (обязательно) */
  board: buildEntityIdSchema('Board'),

  /** Дата начала спринта YYYY-MM-DD (опционально) */
  startDate: z.string().optional(),

  /** Дата окончания спринта YYYY-MM-DD (опционально) */
  endDate: z.string().optional(),

  /** Дата и время начала спринта ISO 8601 (опционально) */
  startDateTime: z.string().optional(),

  /** Дата и время окончания спринта ISO 8601 (опционально) */
  endDateTime: z.string().optional(),

  /** Статус спринта (опционально) */
  status: SprintStatusSchema.optional(),

  /** Список полей для возврата (обязательный) */
  fields: FieldsSchema,
});

export type CreateSprintParams = z.infer<typeof CreateSprintParamsSchema>;

export const CreateSprintOutputDataSchema = z.object({
  sprint: FilteredEntitySchema,
  message: z.string(),
});

export const CreateSprintOutputSchema = buildOutputSchema(CreateSprintOutputDataSchema);
