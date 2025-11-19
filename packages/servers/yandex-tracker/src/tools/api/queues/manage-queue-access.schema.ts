/**
 * Zod схема для валидации параметров ManageQueueAccessTool
 */

import { z } from 'zod';
import { FieldsSchema } from '../../../common/schemas/index.js';

/**
 * Схема параметров для управления доступом к очереди
 */
export const ManageQueueAccessParamsSchema = z.object({
  /**
   * Идентификатор или ключ очереди (обязательно)
   */
  queueId: z.string().min(1, 'Queue ID не может быть пустым'),

  /**
   * Роль в очереди (обязательно)
   */
  role: z.enum(['queue-lead', 'team-member', 'follower', 'access']),

  /**
   * Массив ID пользователей или групп (обязательно)
   */
  subjects: z.array(z.string().min(1)).min(1, 'Subjects не может быть пустым'),

  /**
   * Действие (обязательно)
   */
  action: z.enum(['add', 'remove']),

  /**
   * Список полей для возврата (обязательно)
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type ManageQueueAccessParams = z.infer<typeof ManageQueueAccessParamsSchema>;
