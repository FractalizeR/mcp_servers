/**
 * Zod схема для валидации параметров ManageSprintLifecycleTool
 *
 * start/archive/delete объединены в один инструмент с параметром `action`
 * (см. примечание в `#tracker_api/dto/sprint/manage-sprint-lifecycle.dto.js`).
 * Для name/dates/status — `update_sprint`.
 *
 * `version` — query-параметр `_start`/`_archive` (не тело): без него API отвечает
 * `428` (живая проба 2026-08-26). `delete` версию не принимает вовсе — `.refine()`
 * ниже отклоняет её схемой, а не молча игнорирует, иначе передавший version с
 * `action: 'delete'` решил бы, что получил оптимистичную блокировку, которой нет.
 */

import { z } from 'zod';
import {
  FieldsSchema,
  FilteredEntitySchema,
  buildOutputSchema,
  buildEntityIdSchema,
} from '#common/schemas/index.js';

export const ManageSprintLifecycleParamsSchema = z
  .object({
    /** Идентификатор спринта (обязательно) */
    sprintId: buildEntityIdSchema('Sprint'),

    /** Действие: запустить / архивировать / удалить спринт (обязательно) */
    action: z.enum(['start', 'archive', 'delete']),

    /**
     * Версия спринта для оптимистичной блокировки (опционально; только для
     * `start`/`archive`). Не передана — операция читает текущую версию сама.
     */
    version: z.number().int().positive().optional(),

    /**
     * Список полей для возврата (обязательный, как у всех инструментов сервера —
     * корневой CLAUDE.md, «Фильтрация полей»). У `delete` спринт в ответе `null` —
     * значение задекларировано, но фильтровать нечего.
     */
    fields: FieldsSchema,
  })
  .refine((data) => !(data.action === 'delete' && data.version !== undefined), {
    message: "version недоступна для action 'delete': эндпоинт удаления версию не принимает",
    path: ['version'],
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
