/**
 * Zod схема для валидации параметров GetCommentsTool
 */

import { z } from 'zod';
import {
  IssueKeysSchema,
  ExpandSchema,
  FieldsSchema,
  PageSchema,
  makePerPageSchema,
} from '#common/schemas/index.js';

/**
 * Схема параметров для получения комментариев
 */
export const GetCommentsParamsSchema = z.object({
  /**
   * Массив идентификаторов или ключей задач (обязательно)
   */
  issueIds: IssueKeysSchema.describe("Array of issue IDs or keys (e.g., ['TEST-123', 'TEST-456'])"),

  /**
   * Количество комментариев на странице (опционально)
   */
  perPage: makePerPageSchema(500),

  /**
   * Номер страницы (опционально)
   */
  page: PageSchema,

  /**
   * Параметр expand для включения дополнительных данных (опционально)
   */
  expand: ExpandSchema,

  /**
   * Массив полей для возврата в результате (обязательный)
   * Примеры: ['id', 'text', 'createdAt'], ['id', 'text', 'createdBy.login']
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type GetCommentsParams = z.infer<typeof GetCommentsParamsSchema>;
