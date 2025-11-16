/**
 * Zod схема для валидации параметров CreateIssueTool
 */

import { z } from 'zod';
import { FieldsSchema } from '@mcp-framework/core';

/**
 * Схема параметров для создания задачи
 */
export const CreateIssueParamsSchema = z.object({
  /**
   * Ключ очереди (обязательно)
   */
  queue: z.string().min(1, 'Queue key не может быть пустым'),

  /**
   * Краткое описание задачи (обязательно)
   */
  summary: z.string().min(1, 'Summary не может быть пустым'),

  /**
   * Подробное описание задачи (опционально)
   */
  description: z.string().optional(),

  /**
   * Исполнитель - логин или UID (опционально)
   */
  assignee: z.string().optional(),

  /**
   * Приоритет - ключ приоритета (опционально)
   */
  priority: z.string().optional(),

  /**
   * Тип задачи - ключ типа (опционально)
   */
  type: z.string().optional(),

  /**
   * Кастомные поля Трекера (опционально)
   * Формат: { "fieldKey": "value" }
   */
  customFields: z.record(z.unknown()).optional(),

  /**
   * Опциональный массив полей для фильтрации ответа
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type CreateIssueParams = z.infer<typeof CreateIssueParamsSchema>;
