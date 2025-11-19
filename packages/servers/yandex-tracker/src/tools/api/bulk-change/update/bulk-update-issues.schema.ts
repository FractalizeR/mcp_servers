/**
 * Zod схема для валидации параметров BulkUpdateIssuesTool
 */

import { z } from 'zod';

/**
 * Схема для тегов (add/remove)
 */
const TagsSchema = z
  .object({
    add: z.array(z.string().min(1)).optional().describe('Теги для добавления'),
    remove: z.array(z.string().min(1)).optional().describe('Теги для удаления'),
  })
  .optional()
  .describe('Теги (можно добавлять и удалять)');

/**
 * Схема для значений обновления
 */
const BulkUpdateValuesSchema = z
  .object({
    summary: z.string().min(1).optional().describe('Краткое описание задачи'),
    description: z.string().optional().describe('Подробное описание задачи'),
    assignee: z.string().optional().describe('Исполнитель (логин пользователя)'),
    priority: z.string().min(1).optional().describe('Приоритет задачи'),
    type: z.string().min(1).optional().describe('Тип задачи'),
    tags: TagsSchema,
    components: z.array(z.number()).optional().describe('ID компонентов'),
    versions: z.array(z.number()).optional().describe('ID версий'),
    start: z.string().optional().describe('Дата начала (ISO 8601)'),
    end: z.string().optional().describe('Дедлайн (ISO 8601)'),
  })
  .passthrough() // Разрешаем дополнительные поля для кастомных полей
  .refine((values) => Object.keys(values).length > 0, {
    message: 'Должно быть указано хотя бы одно поле для обновления',
  });

/**
 * Схема параметров для массового обновления задач
 */
export const BulkUpdateIssuesParamsSchema = z.object({
  /**
   * Массив ключей задач для обновления
   */
  issues: z
    .array(z.string().regex(/^[A-Z][A-Z0-9]+-\d+$/, 'Неверный формат ключа задачи'))
    .min(1, 'Должна быть указана хотя бы одна задача')
    .describe('Массив ключей задач (например, ["PROJ-123", "PROJ-456"])'),

  /**
   * Объект с обновляемыми полями
   */
  values: BulkUpdateValuesSchema,
});

/**
 * Вывод типа из схемы
 */
export type BulkUpdateIssuesParams = z.infer<typeof BulkUpdateIssuesParamsSchema>;
