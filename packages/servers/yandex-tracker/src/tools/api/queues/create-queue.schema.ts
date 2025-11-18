/**
 * Zod схема для валидации параметров CreateQueueTool
 */

import { z } from 'zod';

/**
 * Схема параметров для создания очереди
 */
export const CreateQueueParamsSchema = z.object({
  /**
   * Уникальный ключ очереди (обязательно)
   */
  key: z.string().regex(/^[A-Z]{2,10}$/, 'Ключ очереди должен быть A-Z, 2-10 символов'),

  /**
   * Название очереди (обязательно)
   */
  name: z.string().min(1, 'Name не может быть пустым'),

  /**
   * ID или login руководителя (обязательно)
   */
  lead: z.string().min(1, 'Lead не может быть пустым'),

  /**
   * ID типа задачи по умолчанию (обязательно)
   */
  defaultType: z.string().min(1, 'DefaultType не может быть пустым'),

  /**
   * ID приоритета по умолчанию (обязательно)
   */
  defaultPriority: z.string().min(1, 'DefaultPriority не может быть пустым'),

  /**
   * Описание очереди (опционально)
   */
  description: z.string().optional(),

  /**
   * Массив ID доступных типов задач (опционально)
   */
  issueTypes: z.array(z.string()).optional(),
});

/**
 * Вывод типа из схемы
 */
export type CreateQueueParams = z.infer<typeof CreateQueueParamsSchema>;
