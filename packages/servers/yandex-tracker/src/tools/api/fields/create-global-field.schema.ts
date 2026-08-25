/**
 * Zod схема для валидации параметров CreateGlobalFieldTool
 *
 * ВАЖНО: создаёт ГЛОБАЛЬНОЕ кастомное поле (`POST /v3/fields`), видимое во
 * всей организации. Для локального поля ОДНОЙ очереди используйте
 * `create_queue_local_field` (`#tools/api/queue-local-fields`) — там другая
 * схема тела запроса и своя адресация.
 */

import { z } from 'zod';
import { FieldsSchema, FilteredEntitySchema, buildOutputSchema } from '#common/schemas/index.js';
import {
  FieldSchemaValueSchema,
  FieldOptionValueSchema,
  FieldOptionsProviderValueSchema,
} from './field-value.schema.js';

export const CreateGlobalFieldParamsSchema = z.object({
  /** Название поля (обязательно) */
  name: z.string().min(1, 'Название поля обязательно'),

  /** Описание поля (опционально) */
  description: z.string().optional(),

  /**
   * Схема поля — тип данных (обязательно).
   * ВАЖНО: после создания тип поля (schema.type) нельзя изменить.
   */
  schema: FieldSchemaValueSchema,

  /** Является ли поле только для чтения (опционально) */
  readonly: z.boolean().optional(),

  /** Опции выбора для полей типа select/multiselect (опционально) */
  options: z.array(FieldOptionValueSchema).optional(),

  /** Включить автоподстановку значений (опционально) */
  suggest: z.boolean().optional(),

  /** Провайдер опций для динамических полей (опционально) */
  optionsProvider: FieldOptionsProviderValueSchema.optional(),

  /** Список полей для возврата (обязательно) */
  fields: FieldsSchema,
});

export type CreateGlobalFieldParams = z.infer<typeof CreateGlobalFieldParamsSchema>;

export const CreateGlobalFieldOutputDataSchema = z.object({
  globalField: FilteredEntitySchema,
  message: z.string(),
});

export const CreateGlobalFieldOutputSchema = buildOutputSchema(CreateGlobalFieldOutputDataSchema);
