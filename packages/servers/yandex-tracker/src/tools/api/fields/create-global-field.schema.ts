/**
 * Zod схема для валидации параметров CreateGlobalFieldTool
 *
 * ВАЖНО: создаёт ГЛОБАЛЬНОЕ кастомное поле (`POST /v3/fields`), видимое во
 * всей организации. Для локального поля ОДНОЙ очереди используйте
 * `create_queue_local_field` (`#tools/api/queue-local-fields`) — там другая
 * схема тела запроса и своя адресация.
 *
 * `options`/`suggest` в теле создания у API нет (см. D10, `0_CONTRACTS.md`) —
 * набор значений поля задаётся через `optionsProvider`.
 *
 * РАСХОЖДЕНИЕ С ПРАВКОЙ (не устранено здесь — файл вне набора этого пакета фиксов,
 * `UpdateGlobalFieldParamsSchema` не трогается по прямому указанию задачи): здесь
 * `name: {en, ru}`, а `update-global-field.schema.ts` объявляет `name: z.string()`.
 * Официальная документация Трекера (`api-ref/issues/patch-issue-field-name`, снято
 * 2026-08-25) описывает тело PATCH `{ name: { en, ru } }` — то есть объект, как и на
 * создании, а не строка. Форма живьём не проверена (см. BRIEF, известные допущения) —
 * это наблюдение из документации, а не догадка, но менять контракт правки в этом
 * пакете не входит в задачу. Вопрос живому прогону: подтвердить форму `name` на
 * `PATCH /v3/fields/{id}` и привести `UpdateGlobalFieldParamsSchema.name` к `{en, ru}`.
 */

import { z } from 'zod';
import { FieldsSchema, FilteredEntitySchema, buildOutputSchema } from '#common/schemas/index.js';
import { FieldNameValueSchema, FieldOptionsProviderValueSchema } from './field-value.schema.js';

export const CreateGlobalFieldParamsSchema = z.object({
  /** Короткий идентификатор поля (обязательно) */
  id: z
    .string()
    .min(1, 'ID поля обязателен')
    .describe('Короткий идентификатор поля, придумывается вызывающим (например "customPriority")'),

  /** Локализованное название поля — {en, ru} (обязательно) */
  name: FieldNameValueSchema.describe('Локализованное название поля — {en, ru}'),

  /** Идентификатор категории поля — см. get_global_fields (обязательно) */
  category: z
    .string()
    .min(1, 'Категория обязательна')
    .describe('ID категории поля — справочник GET /v3/fields/categories или get_global_fields'),

  /**
   * Тип поля (обязательно). После создания изменить нельзя.
   *
   * Подтверждённая рабочая форма — полное имя класса, например
   * 'ru.yandex.startrek.core.fields.StringFieldType',
   * 'ru.yandex.startrek.core.fields.DateFieldType',
   * 'ru.yandex.startrek.core.fields.IntegerFieldType'.
   * Документация называет также короткую форму ('StringFieldType') —
   * живьём не проверена.
   */
  type: z
    .string()
    .min(1, 'Тип поля обязателен')
    .describe(
      'Тип поля, после создания не меняется. Полное имя класса, например ' +
        "'ru.yandex.startrek.core.fields.StringFieldType', 'DateFieldType', 'IntegerFieldType'"
    ),

  /** Порядок отображения поля (опционально) */
  order: z.number().optional(),

  /** Описание поля (опционально) */
  description: z.string().optional(),

  /** Является ли поле только для чтения (опционально) */
  readonly: z.boolean().optional(),

  /** Видимость поля (опционально) */
  visible: z.boolean().optional(),

  /** Скрыто ли поле (опционально) */
  hidden: z.boolean().optional(),

  /** Является ли поле контейнером — массивом значений (опционально) */
  container: z.boolean().optional(),

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
