/**
 * Zod схема для валидации параметров CreateComponentTool
 */

import { z } from 'zod';
import { FieldsSchema } from '../../../common/schemas/index.js';

/**
 * Схема параметров для создания компонента
 */
export const CreateComponentParamsSchema = z.object({
  /**
   * ID или ключ очереди
   */
  queueId: z.string().min(1, 'Queue ID обязателен'),

  /**
   * Название компонента
   */
  name: z.string().min(1, 'Название компонента обязательно'),

  /**
   * Описание компонента (опционально)
   */
  description: z.string().optional(),

  /**
   * ID или login руководителя компонента (опционально)
   */
  lead: z.string().optional(),

  /**
   * Автоматическое назначение задач (опционально)
   */
  assignAuto: z.boolean().optional(),

  /**
   * Массив полей для возврата в результате (обязательный)
   * Примеры: ['id', 'name'], ['id', 'name', 'description', 'lead.login']
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type CreateComponentParams = z.infer<typeof CreateComponentParamsSchema>;
