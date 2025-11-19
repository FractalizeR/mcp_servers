/**
 * Zod схема для валидации параметров UpdateQueueTool
 */

import { z } from 'zod';
import { FieldsSchema } from '../../../common/schemas/index.js';

/**
 * Схема параметров для обновления очереди
 */
export const UpdateQueueParamsSchema = z.object({
  /**
   * Идентификатор или ключ очереди (обязательно)
   */
  queueId: z.string().min(1, 'Queue ID не может быть пустым'),

  /**
   * Название очереди (опционально)
   */
  name: z.string().optional(),

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
   * Массив ID доступных типов задач (опционально)
   */
  issueTypes: z.array(z.string()).optional(),

  /**
   * Список полей для возврата (обязательно)
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type UpdateQueueParams = z.infer<typeof UpdateQueueParamsSchema>;
