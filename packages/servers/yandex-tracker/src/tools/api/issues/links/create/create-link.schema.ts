/**
 * Zod схема для валидации параметров CreateLinkTool
 */

import { z } from 'zod';
import { IssueKeySchema, FieldsSchema } from '#common/schemas/index.js';

/**
 * Enum для типов связей (relationship)
 *
 * Соответствует LinkRelationship из entity
 */
export const LinkRelationshipSchema = z.enum([
  'relates',
  'is duplicated by',
  'duplicates',
  'is subtask of',
  'has subtasks',
  'depends on',
  'is dependent by',
  'is epic of',
  'has epic',
]);

/**
 * Схема параметров для создания связей (batch)
 *
 * Стратегия B: Индивидуальные данные
 * - Каждая связь имеет свои issueId, relationship, targetIssue
 * - Поля для возврата (fields) применяются ко всем связям
 */
export const CreateLinkParamsSchema = z.object({
  /**
   * Массив связей с индивидуальными параметрами для каждой связи
   */
  links: z
    .array(
      z.object({
        issueId: IssueKeySchema.describe('Issue ID or key (from)'),
        relationship: LinkRelationshipSchema.describe('Link type and direction'),
        targetIssue: IssueKeySchema.describe('Target issue ID or key (to)'),
      })
    )
    .min(1)
    .describe('Array of links to create'),

  /**
   * Поля для возврата в результате (применяется ко всем связям)
   * Примеры: ['id', 'type', 'object'], ['id', 'type.id', 'object.key']
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type CreateLinkParams = z.infer<typeof CreateLinkParamsSchema>;
