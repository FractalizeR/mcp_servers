/**
 * Zod схема для валидации параметров CreateLinkTool
 */

import { z } from 'zod';
import {
  IssueKeySchema,
  FieldsSchema,
  FilteredEntitySchema,
  buildOutputSchema,
  makeBatchResultSchema,
} from '#common/schemas/index.js';

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
 * - Каждая связь имеет свои issueId, relationship, targetIssueId
 * - Поля для возврата (fields) применяются ко всем связям
 */
export const CreateLinkParamsSchema = z.object({
  /**
   * Массив связей с индивидуальными параметрами для каждой связи
   */
  links: z
    .array(
      z.object({
        issueId: IssueKeySchema.describe('ID или ключ задачи (откуда)'),
        relationship: LinkRelationshipSchema.describe('Тип и направление связи'),
        targetIssueId: IssueKeySchema.describe('ID или ключ целевой задачи (куда)'),
      })
    )
    .min(1)
    .describe('Массив связей для создания'),

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

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`).
 *
 * Канон `{ total, successful[], failed[] }` (`makeBatchResultSchema`,
 * `#common/schemas`) — раньше `successful`/`failed` были числами, а элементы
 * успеха лежали в отдельном поле `links` рядом с `errors` (несовпадающие
 * имена для одного и того же понятия). См. README §1/2.0 плана
 * `plan_tool_contract_unification`.
 */
export const CreateLinkOutputDataSchema = makeBatchResultSchema(
  'issueId',
  z.object({
    linkId: z.string(),
    link: FilteredEntitySchema,
  })
);

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const CreateLinkOutputSchema = buildOutputSchema(CreateLinkOutputDataSchema);
