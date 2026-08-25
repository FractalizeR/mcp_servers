/**
 * Zod схема для валидации параметров UpdateGlobalFieldTool
 *
 * ВАЖНО: обновляет ГЛОБАЛЬНОЕ поле (`PATCH /v3/fields/{fieldId}`), адресуется
 * полным `fieldId` (в т.ч. `id`/`self` из `get_global_field(s)`). Для
 * ЛОКАЛЬНОГО поля очереди используйте `update_queue_local_field` — там
 * адресация коротким `key`, а не `fieldId`. Тип поля (schema.type) после
 * создания неизменяем, поэтому здесь его нет (см. `UpdateFieldDto`).
 */

import { z } from 'zod';
import { FieldsSchema, FilteredEntitySchema, buildOutputSchema } from '#common/schemas/index.js';
import { FieldOptionValueSchema, FieldOptionsProviderValueSchema } from './field-value.schema.js';

export const UpdateGlobalFieldParamsSchema = z.object({
  /** Идентификатор глобального поля (обязательно) */
  fieldId: z.string().min(1, 'Field ID не может быть пустым'),

  /** Новое название поля (опционально) */
  name: z.string().min(1).optional(),

  /** Новое описание поля (опционально) */
  description: z.string().optional(),

  /** Является ли поле только для чтения (опционально) */
  readonly: z.boolean().optional(),

  /** Опции выбора для полей типа select/multiselect — замещает список целиком (опционально) */
  options: z.array(FieldOptionValueSchema).optional(),

  /** Включить автоподстановку значений (опционально) */
  suggest: z.boolean().optional(),

  /** Провайдер опций для динамических полей (опционально) */
  optionsProvider: FieldOptionsProviderValueSchema.optional(),

  /** Список полей для возврата (обязательно) */
  fields: FieldsSchema,
});

export type UpdateGlobalFieldParams = z.infer<typeof UpdateGlobalFieldParamsSchema>;

export const UpdateGlobalFieldOutputDataSchema = z.object({
  globalField: FilteredEntitySchema,
});

export const UpdateGlobalFieldOutputSchema = buildOutputSchema(UpdateGlobalFieldOutputDataSchema);
