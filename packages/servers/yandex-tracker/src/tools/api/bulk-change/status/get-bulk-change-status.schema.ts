/**
 * Zod схема для валидации параметров GetBulkChangeStatusTool
 */

import { z } from 'zod';
import { buildOutputSchema, FieldsSchema, FilteredEntitySchema } from '#common/schemas/index.js';

/**
 * Схема параметров для получения статуса bulk операции
 */
export const GetBulkChangeStatusParamsSchema = z.object({
  /**
   * ID операции (возвращается при создании bulk операции)
   */
  operationId: z.string().min(1).describe('ID операции массового изменения'),

  /**
   * Список полей поддерева `operation` для возврата (обязательно). Живая
   * проверка 2026-08-20 нашла: без фильтрации `createdBy` тащит полный
   * объект пользователя (включая `cloudUid`/`passportUid`) безусловно —
   * `fields` даёт вызывающему контроль над этим так же, как у остальных
   * инструментов, читающих сущности API.
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type GetBulkChangeStatusParams = z.infer<typeof GetBulkChangeStatusParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 *
 * `operationId`/`message` — всегда присутствуют (эхо запроса и вычисляемый
 * человекочитаемый статус), фильтрации не подлежат. `operation` — сырой
 * `BulkChangeOperation` (см. `tracker_api/entities/bulk-change.entity.ts`),
 * отфильтрованный по `fields` — то самое поддерево, где явно запрошенные
 * поля (`status`, `createdBy.display`, ...) экономят контекст так же, как у
 * инструментов чтения сущностей (`get_queue` и т.п.), а не безусловно тащат
 * весь `createdBy`.
 */
export const GetBulkChangeStatusOutputDataSchema = z.object({
  operationId: z.string(),
  message: z.string(),
  operation: FilteredEntitySchema,
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const GetBulkChangeStatusOutputSchema = buildOutputSchema(
  GetBulkChangeStatusOutputDataSchema
);
