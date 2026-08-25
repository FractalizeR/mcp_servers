/**
 * Zod схема для валидации параметров UpdateQueueTool
 */

import { z } from 'zod';
import { FieldsSchema, FilteredEntitySchema, buildOutputSchema } from '#common/schemas/index.js';

/**
 * Схема параметров для обновления очереди
 */
/**
 * Параметра `issueTypes` здесь нет намеренно: `PATCH /v3/queues/{id}` отвечает на него
 * `400 issueTypes: Incorrect data format` — проверено живьём 2026-08-25 на одноразовой
 * очереди прогона. Тот же ответ даёт создание очереди, откуда параметр убран тем же днём.
 */
export const UpdateQueueParamsSchema = z.object({
  /**
   * Идентификатор или ключ очереди (обязательно)
   */
  queueId: z.string().min(1, 'Queue ID не может быть пустым'),

  /**
   * Название очереди (опционально, лимит найден живым прогоном API — тот же,
   * что у создания)
   */
  name: z.string().max(40, 'Name не может быть длиннее 40 символов').optional(),

  /**
   * ID или login руководителя (опционально)
   */
  lead: z.string().optional(),

  /**
   * ID типа задачи по умолчанию (опционально)
   */
  defaultType: z.string().optional(),

  /**
   * ID приоритета по умолчанию (опционально)
   */
  defaultPriority: z.string().optional(),

  /**
   * Описание очереди (опционально)
   */
  description: z.string().optional(),

  /**
   * Список полей для возврата (обязательно)
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type UpdateQueueParams = z.infer<typeof UpdateQueueParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const UpdateQueueOutputDataSchema = z.object({
  queueKey: z.string(),
  queue: FilteredEntitySchema,
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const UpdateQueueOutputSchema = buildOutputSchema(UpdateQueueOutputDataSchema);
