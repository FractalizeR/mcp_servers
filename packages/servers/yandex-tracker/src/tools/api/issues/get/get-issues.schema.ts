/**
 * Zod схема для валидации параметров GetIssuesTool
 */

import { z } from 'zod';
import {
  IssueKeysSchema,
  FieldsSchema,
  FilteredEntitySchema,
  buildOutputSchema,
  makeBatchResultSchema,
} from '#common/schemas/index.js';

/**
 * Схема параметров для получения задач
 */
export const GetIssuesParamsSchema = z.object({
  /**
   * Массив ключей задач для получения
   */
  issueIds: IssueKeysSchema,

  /**
   * Опциональный массив полей для фильтрации ответа
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type GetIssuesParams = z.infer<typeof GetIssuesParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`).
 *
 * Канон `{ total, successful[], failed[] }` (`makeBatchResultSchema`,
 * `#common/schemas`) — раньше `successful`/`failed` были числами, а элементы
 * успеха/отказа звали идентификатор задачи по-разному (`issueKey` у успеха,
 * `key` у отказа). См. README §1/2.0 плана `plan_tool_contract_unification`.
 */
export const GetIssuesOutputDataSchema = makeBatchResultSchema(
  'issueId',
  z.object({ issue: FilteredEntitySchema })
);

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const GetIssuesOutputSchema = buildOutputSchema(GetIssuesOutputDataSchema);
