/**
 * Базовая Zod схема для проектов (переиспользуется в Create и Update)
 */

import { z } from 'zod';

/**
 * Возможные статусы проекта
 */
export const ProjectStatusSchema = z.enum([
  'draft',
  'in_progress',
  'launched',
  'postponed',
  'at_risk',
]);

/**
 * Базовые поля проекта (без ключа/ID)
 */
export const BaseProjectFieldsSchema = z.object({
  /**
   * Название проекта
   */
  name: z.string().min(1, 'Название проекта не может быть пустым'),

  /**
   * ID или login руководителя проекта
   */
  lead: z.string().min(1, 'Руководитель проекта не может быть пустым'),

  /**
   * Статус проекта
   */
  status: ProjectStatusSchema,

  /**
   * Описание проекта
   */
  description: z.string(),

  /**
   * Дата начала проекта в формате YYYY-MM-DD
   */
  startDate: z.string(),

  /**
   * Дата окончания проекта в формате YYYY-MM-DD
   */
  endDate: z.string(),

  /**
   * Массив ключей очередей, связанных с проектом
   */
  queueIds: z.array(z.string()),

  /**
   * Массив ID или login участников проекта
   */
  teamUserIds: z.array(z.string()),
});
