/**
 * Zod схема для валидации параметров BulkUpdateIssuesTool
 */

import { z } from 'zod';
import { buildOutputSchema, IssueKeysSchema } from '#common/schemas/index.js';

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
   * Массив идентификаторов задач для обновления (ключ или внутренний id)
   */
  issueIds: IssueKeysSchema,

  /**
   * Объект с обновляемыми полями
   */
  values: BulkUpdateValuesSchema,
});

/**
 * Вывод типа из схемы
 */
export type BulkUpdateIssuesParams = z.infer<typeof BulkUpdateIssuesParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const BulkUpdateIssuesOutputDataSchema = z.object({
  message: z.string(),
  operationId: z.string(),
  status: z.string(),
  totalIssues: z.number(),
  updatedFields: z.array(z.string()),
  note: z.string(),
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const BulkUpdateIssuesOutputSchema = buildOutputSchema(BulkUpdateIssuesOutputDataSchema);
