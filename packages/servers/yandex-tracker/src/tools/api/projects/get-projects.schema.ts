/**
 * Zod схема для валидации параметров GetProjectsTool
 */

import { z } from 'zod';

/**
 * Схема параметров для получения списка проектов
 */
export const GetProjectsParamsSchema = z.object({
  /**
   * Количество записей на странице (опционально)
   */
  perPage: z.number().int().min(1).max(100).optional(),

  /**
   * Номер страницы (начинается с 1)
   */
  page: z.number().int().min(1).optional(),

  /**
   * Дополнительные поля для включения в ответ (опционально)
   */
  expand: z.string().optional(),

  /**
   * Фильтр по ID очереди (опционально)
   */
  queueId: z.string().optional(),
});

/**
 * Вывод типа из схемы
 */
export type GetProjectsParams = z.infer<typeof GetProjectsParamsSchema>;
