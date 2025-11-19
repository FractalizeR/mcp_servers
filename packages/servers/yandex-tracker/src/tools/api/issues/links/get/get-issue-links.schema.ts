/**
 * Zod схема для валидации параметров GetIssueL inksTool
 */

import { z } from 'zod';
import { IssueKeySchema, FieldsSchema } from '../../../../../common/schemas/index.js';

/**
 * Схема параметров для получения связей задачи
 */
export const GetIssueLinksParamsSchema = z.object({
  /**
   * Ключ или ID задачи для получения связей
   */
  issueId: IssueKeySchema,

  /**
   * Массив полей для возврата в результате (обязательный)
   * Примеры: ['id', 'type', 'object'], ['id', 'type.id', 'object.key']
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type GetIssueLinksParams = z.infer<typeof GetIssueLinksParamsSchema>;
