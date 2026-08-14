/**
 * Zod схема для валидации параметров UpdateQueueLocalFieldTool
 *
 * ВАЖНО (нюанс из референсного клиента): поле адресуется коротким `key`
 * ('myField'), НЕ глобальным `id`/`self` ('<hex>--myField') — см.
 * `#tracker_api/entities/queue-local-field.entity.js`.
 */

import { z } from 'zod';
import {
  FieldsSchema,
  FilteredEntitySchema,
  FieldsReturnedSchema,
  buildOutputSchema,
} from '#common/schemas/index.js';

export const UpdateQueueLocalFieldParamsSchema = z.object({
  /** Идентификатор или ключ очереди (обязательно) */
  queueId: z.string().min(1, 'Queue ID не может быть пустым'),

  /** Короткий ключ локального поля — НЕ глобальный id/self (обязательно) */
  key: z.string().min(1, 'Ключ поля не может быть пустым'),

  /** Новое название поля на английском (опционально) */
  nameEn: z.string().min(1).optional(),

  /** Новое название поля на русском (опционально) */
  nameRu: z.string().min(1).optional(),

  /** Идентификатор категории поля (опционально) */
  category: z.string().optional(),

  /** Порядок отображения (опционально) */
  order: z.number().int().optional(),

  /** Описание поля (опционально) */
  description: z.string().optional(),

  /** Только для чтения (опционально) */
  readonly: z.boolean().optional(),

  /** Видимость поля (опционально) */
  visible: z.boolean().optional(),

  /** Скрыто ли поле (опционально) */
  hidden: z.boolean().optional(),

  /** Список полей для возврата (обязательно) */
  fields: FieldsSchema,
});

export type UpdateQueueLocalFieldParams = z.infer<typeof UpdateQueueLocalFieldParamsSchema>;

export const UpdateQueueLocalFieldOutputDataSchema = z.object({
  localField: FilteredEntitySchema,
  fieldsReturned: FieldsReturnedSchema,
});

export const UpdateQueueLocalFieldOutputSchema = buildOutputSchema(
  UpdateQueueLocalFieldOutputDataSchema
);
