/**
 * Zod схема для валидации параметров CreateQueueLocalFieldTool
 */

import { z } from 'zod';
import {
  FieldsSchema,
  FilteredEntitySchema,
  FieldsReturnedSchema,
  buildOutputSchema,
} from '#common/schemas/index.js';

export const CreateQueueLocalFieldParamsSchema = z.object({
  /** Идентификатор или ключ очереди (обязательно) */
  queueId: z.string().min(1, 'Queue ID не может быть пустым'),

  /** Локальный идентификатор поля — короткий ключ, например 'myField' (обязательно) */
  id: z.string().min(1, 'ID поля обязателен'),

  /** Название поля на английском (обязательно) */
  nameEn: z.string().min(1, 'Название на английском обязательно'),

  /** Название поля на русском (обязательно) */
  nameRu: z.string().min(1, 'Название на русском обязательно'),

  /** Идентификатор категории поля — см. get_fields (обязательно) */
  category: z.string().min(1, 'Категория обязательна'),

  /**
   * Тип поля (обязательно), например:
   * 'ru.yandex.startrek.core.fields.StringFieldType',
   * 'ru.yandex.startrek.core.fields.DateFieldType',
   * 'ru.yandex.startrek.core.fields.IntegerFieldType'
   */
  type: z.string().min(1, 'Тип поля обязателен'),

  /** Список полей для возврата (обязательно) */
  fields: FieldsSchema,
});

export type CreateQueueLocalFieldParams = z.infer<typeof CreateQueueLocalFieldParamsSchema>;

export const CreateQueueLocalFieldOutputDataSchema = z.object({
  localField: FilteredEntitySchema,
  message: z.string(),
  fieldsReturned: FieldsReturnedSchema,
});

export const CreateQueueLocalFieldOutputSchema = buildOutputSchema(
  CreateQueueLocalFieldOutputDataSchema
);
