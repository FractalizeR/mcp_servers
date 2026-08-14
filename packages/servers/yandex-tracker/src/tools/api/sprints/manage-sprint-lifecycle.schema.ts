/**
 * Zod схема для валидации параметров ManageSprintLifecycleTool
 *
 * ВАЖНО: start/archive/delete — одинаковая форма запроса ({sprintId, action}),
 * без action-специфичных полей тела, поэтому безопасно объединены в один
 * инструмент (см. примечание в `#tracker_api/dto/sprint/
 * manage-sprint-lifecycle.dto.js`). Для name/dates/status — `update_sprint`.
 */

import { z } from 'zod';
import { FilteredEntitySchema, buildOutputSchema } from '#common/schemas/index.js';

export const ManageSprintLifecycleParamsSchema = z.object({
  /** Идентификатор спринта (обязательно) */
  sprintId: z.string().min(1, 'Sprint ID не может быть пустым'),

  /** Действие: запустить / архивировать / удалить спринт (обязательно) */
  action: z.enum(['start', 'archive', 'delete']),
});

export type ManageSprintLifecycleParams = z.infer<typeof ManageSprintLifecycleParamsSchema>;

export const ManageSprintLifecycleOutputDataSchema = z.object({
  sprintId: z.string(),
  action: z.enum(['start', 'archive', 'delete']),
  sprint: FilteredEntitySchema.nullable(),
  message: z.string(),
});

export const ManageSprintLifecycleOutputSchema = buildOutputSchema(
  ManageSprintLifecycleOutputDataSchema
);
