/**
 * Zod схема для валидации параметров CreateProjectTool
 */

import { z } from 'zod';

/**
 * Возможные статусы проекта
 */
const ProjectStatusSchema = z.enum(['draft', 'in_progress', 'launched', 'postponed', 'at_risk']);

/**
 * Схема параметров для создания проекта
 */
export const CreateProjectParamsSchema = z.object({
  /**
   * Уникальный ключ проекта (обязательно)
   */
  key: z.string().min(1, 'Ключ проекта не может быть пустым'),

  /**
   * Название проекта (обязательно)
   */
  name: z.string().min(1, 'Название проекта не может быть пустым'),

  /**
   * ID или login руководителя проекта (обязательно)
   */
  lead: z.string().min(1, 'Руководитель проекта не может быть пустым'),

  /**
   * Статус проекта (опционально)
   */
  status: ProjectStatusSchema.optional(),

  /**
   * Описание проекта (опционально)
   */
  description: z.string().optional(),

  /**
   * Дата начала проекта в формате YYYY-MM-DD (опционально)
   */
  startDate: z.string().optional(),

  /**
   * Дата окончания проекта в формате YYYY-MM-DD (опционально)
   */
  endDate: z.string().optional(),

  /**
   * Массив ключей очередей, связанных с проектом (опционально)
   */
  queueIds: z.array(z.string()).optional(),

  /**
   * Массив ID или login участников проекта (опционально)
   */
  teamUserIds: z.array(z.string()).optional(),
});

/**
 * Вывод типа из схемы
 */
export type CreateProjectParams = z.infer<typeof CreateProjectParamsSchema>;
