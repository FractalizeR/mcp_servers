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
 *
 * Параметров `startDateTime`/`endDateTime` здесь нет намеренно: `POST /v3/sprints`
 * отвергает их ключом тела — `400 …: Incorrect data format` на всех проверенных
 * формах ISO 8601, включая ту, что сам API отдаёт в ответе
 * (`2026-09-01T00:00:00.000+0000`) (живая проба 2026-08-26). В разделе запроса
 * документации post-sprint этих имён нет вовсе — они встречаются только в примере
 * ответа. Даты задаются только `startDate`/`endDate` (YYYY-MM-DD).
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
