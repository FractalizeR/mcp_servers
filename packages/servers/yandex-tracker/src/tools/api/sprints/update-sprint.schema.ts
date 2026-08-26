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
 *
 * Параметров `startDateTime`/`endDateTime` здесь нет намеренно: `PATCH
 * /v3/sprints/{id}` отвергает их ключом тела — `400 …: Incorrect data format` на
 * всех проверенных формах ISO 8601, включая ту, что сам API отдаёт в ответе
 * (`2026-09-01T00:00:00.000+0000`) (живая проба 2026-08-26). В разделе запроса
 * документации patch-sprint этих имён нет вовсе — они встречаются только в
 * примере ответа. Даты задаются только `startDate`/`endDate` (YYYY-MM-DD).
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
