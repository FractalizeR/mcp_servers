/**
 * Zod схема для валидации параметров UpdateProjectTool
 */

import { z } from 'zod';

/**
 * Возможные статусы проекта
 */
const ProjectStatusSchema = z.enum(['draft', 'in_progress', 'launched', 'postponed', 'at_risk']);

/**
 * Схема параметров для обновления проекта
 */
export const UpdateProjectParamsSchema = z.object({
  /**
   * ID или ключ проекта (обязательно)
   */
  projectId: z.string().min(1, 'ID проекта не может быть пустым'),

  /**
   * Название проекта (опционально)
   */
  name: z.string().optional(),

  /**
   * ID или login руководителя проекта (опционально)
   */
  lead: z.string().optional(),

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
export type UpdateProjectParams = z.infer<typeof UpdateProjectParamsSchema>;
