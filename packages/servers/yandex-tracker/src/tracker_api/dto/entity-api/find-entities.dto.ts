/**
 * DTO для поиска/списка записей Entity API (Goal/Project/Portfolio)
 */

import type { EntityApiType } from '#tracker_api/entities/index.js';

export interface FindEntitiesDto {
  /** Тип записи Entity API */
  entityType: EntityApiType;

  /** Строка поиска (опционально) */
  searchString?: string | undefined;

  /** Условия фильтрации (опционально) */
  filter?: Record<string, unknown> | undefined;

  /** Поле сортировки (опционально) */
  orderBy?: string | undefined;

  /** Порядок сортировки: true = по возрастанию (опционально) */
  orderAsc?: boolean | undefined;

  /** Только корневые записи, без учёта иерархии (опционально) */
  rootOnly?: boolean | undefined;

  /** Размер страницы (опционально) */
  perPage?: number | undefined;

  /** Непрозрачный курсор следующей страницы (опционально) */
  cursor?: string | undefined;

  /** Полный обход всех страниц (опционально) */
  fetchAll?: boolean | undefined;

  /** Лимит записей при fetchAll (опционально) */
  maxItems?: number | undefined;

  /**
   * Имена содержательных полей записи для query-параметра `fields` API.
   * Без них ответ приходит без объекта `fields` (см.
   * `tools/api/entities/entity-api-fields.util.ts`).
   */
  entityFields?: readonly string[] | undefined;
}
