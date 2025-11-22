/**
 * Базовая Zod схема для полей элемента чеклиста
 *
 * Используется для устранения дублирования между add и update schemas
 */

import { z } from 'zod';

/**
 * Базовая схема полей элемента чеклиста
 *
 * Содержит общие поля для add и update операций
 */
export const BaseChecklistItemFieldsSchema = z.object({
  /**
   * Текст элемента чеклиста
   */
  text: z.string().min(1, 'Текст элемента не может быть пустым'),

  /**
   * Статус выполнения
   */
  checked: z.boolean(),

  /**
   * ID назначенного лица
   */
  assignee: z.string(),

  /**
   * Дедлайн в формате ISO 8601
   */
  deadline: z.string(),
});
