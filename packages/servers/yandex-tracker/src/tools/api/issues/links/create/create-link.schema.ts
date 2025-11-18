/**
 * Zod схема для валидации параметров CreateLinkTool
 */

import { z } from 'zod';
import { IssueKeySchema } from '../../../../../common/schemas/index.js';

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
 * Схема параметров для создания связи
 */
export const CreateLinkParamsSchema = z.object({
  /**
   * Ключ или ID текущей задачи
   */
  issueId: IssueKeySchema,

  /**
   * Тип и направление связи
   */
  relationship: LinkRelationshipSchema,

  /**
   * Ключ или ID связываемой задачи
   */
  targetIssue: IssueKeySchema,
});

/**
 * Вывод типа из схемы
 */
export type CreateLinkParams = z.infer<typeof CreateLinkParamsSchema>;
