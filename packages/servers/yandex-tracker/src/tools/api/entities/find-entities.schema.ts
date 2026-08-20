/**
 * Zod схема для валидации параметров FindEntitiesTool
 */

import { z } from 'zod';
import {
  FieldsSchema,
  CursorSchema,
  makePerPageSchema,
  FetchAllSchema,
  MaxItemsSchema,
  noCursorWithBulkParams,
  PAGINATION_CURSOR_CONFLICT_MESSAGE,
  FilteredEntitySchema,
  PaginationMetaSchema,
  buildOutputSchema,
} from '#common/schemas/index.js';

/**
 * Тип записи Entity API — различает три коллекции с общей формой запроса.
 *
 * ВАЖНО: `entityType: 'project'` — Project ВНУТРИ Entity API
 * (`/v3/entities/project/...`), НЕ legacy `/v2/projects` (см. `get_projects`/
 * `create_project` и др. — отдельные инструменты, другая коллекция).
 */
const EntityApiTypeSchema = z.enum(['goal', 'project', 'portfolio']);

/**
 * Схема параметров для поиска/списка записей Entity API (Goal/Project/Portfolio)
 */
export const FindEntitiesParamsSchema = z
  .object({
    /** Тип записи Entity API — goal/project/portfolio (обязательно) */
    entityType: EntityApiTypeSchema,

    /** Строка полнотекстового поиска (опционально) */
    searchString: z.string().optional(),

    /** Условия фильтрации ключ-значение (опционально) */
    filter: z.record(z.string(), z.unknown()).optional(),

    /** Поле сортировки (опционально) */
    orderBy: z.string().optional(),

    /** Порядок сортировки: true = по возрастанию (опционально) */
    orderAsc: z.boolean().optional(),

    /** Только корневые записи, без учёта иерархии вложенности (опционально) */
    rootOnly: z.boolean().optional(),

    /** Количество записей на странице (опционально) */
    perPage: makePerPageSchema(100),

    /** Непрозрачный курсор следующей страницы (из pagination.nextCursor) */
    cursor: CursorSchema,

    /** Полный обход всех страниц (opt-in) */
    fetchAll: FetchAllSchema,

    /** Лимит записей на цепочку обхода при fetchAll=true */
    maxItems: MaxItemsSchema,

    /** Список полей для возврата (обязательно) */
    fields: FieldsSchema.describe(
      'Список полей для возврата (ОБЯЗАТЕЛЬНЫЙ). Содержательные поля записи запрашиваются как ' +
        '"fields.<имя>", где имя — реальный идентификатор поля Трекера (см. get_global_fields): ' +
        'например "fields.summary". Несуществующее имя API отклоняет целиком (422), а проекция ' +
        '"fields" без имени не поддерживается — Entity API не умеет отдавать все поля разом.'
    ),
  })
  .refine(noCursorWithBulkParams, {
    message: PAGINATION_CURSOR_CONFLICT_MESSAGE,
    path: ['cursor'],
  });

export type FindEntitiesParams = z.infer<typeof FindEntitiesParamsSchema>;

export const FindEntitiesOutputDataSchema = z.object({
  entities: z.array(FilteredEntitySchema),
  count: z.number(),
  entityType: EntityApiTypeSchema,
  pagination: PaginationMetaSchema,
});

export const FindEntitiesOutputSchema = buildOutputSchema(FindEntitiesOutputDataSchema);
