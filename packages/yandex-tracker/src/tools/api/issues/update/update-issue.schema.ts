/**
 * Zod схема для валидации параметров UpdateIssueTool
 */

import { z } from 'zod';
import { IssueKeySchema, FieldsSchema } from '@mcp-framework/core';

/**
 * Схема параметров для обновления задачи
 */
export const UpdateIssueParamsSchema = z.object({
  /**
   * Ключ задачи для обновления
   */
  issueKey: IssueKeySchema,

  /**
   * Краткое описание задачи
   */
  summary: z.string().min(1).optional().describe('Краткое описание задачи'),

  /**
   * Подробное описание задачи
   */
  description: z.string().optional().describe('Подробное описание задачи'),

  /**
   * Исполнитель (логин или UID)
   */
  assignee: z.string().min(1).optional().describe('Исполнитель (логин или UID)'),

  /**
   * Приоритет (ключ приоритета)
   */
  priority: z.string().min(1).optional().describe('Приоритет (ключ приоритета)'),

  /**
   * Тип задачи (ключ типа)
   */
  type: z.string().min(1).optional().describe('Тип задачи (ключ типа)'),

  /**
   * Статус (ключ статуса)
   */
  status: z.string().min(1).optional().describe('Статус (ключ статуса)'),

  /**
   * Кастомные поля для дополнительных полей Трекера
   */
  customFields: z.record(z.string(), z.unknown()).optional().describe('Кастомные поля'),

  /**
   * Опциональный массив полей для фильтрации ответа
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type UpdateIssueParams = z.infer<typeof UpdateIssueParamsSchema>;
