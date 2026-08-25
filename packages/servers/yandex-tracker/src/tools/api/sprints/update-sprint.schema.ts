/**
 * Zod схема для валидации параметров UpdateSprintTool
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
 * Схема параметров для обновления спринта.
 *
 * ВАЖНО: для старта/архивации/удаления спринта используйте отдельный
 * инструмент `manage_sprint_lifecycle` — API Трекера обслуживает их
 * специализированными POST/DELETE-эндпоинтами (`_start`/`_archive`/DELETE),
 * а не универсальным PATCH, которым покрыты только name/dates/status здесь.
 */
export const UpdateSprintParamsSchema = z.object({
  /** Идентификатор спринта (обязательно) */
  sprintId: buildEntityIdSchema('Sprint'),

  /** Новое название спринта (опционально) */
  name: z.string().min(1).optional(),

  /** Версия спринта для оптимистичной блокировки (опционально) */
  version: z.number().int().positive().optional(),

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

export type UpdateSprintParams = z.infer<typeof UpdateSprintParamsSchema>;

export const UpdateSprintOutputDataSchema = z.object({
  sprint: FilteredEntitySchema,
});

export const UpdateSprintOutputSchema = buildOutputSchema(UpdateSprintOutputDataSchema);
