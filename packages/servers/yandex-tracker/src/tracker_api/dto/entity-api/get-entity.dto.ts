/**
 * DTO для получения одной записи Entity API (Goal/Project/Portfolio)
 */

import type { EntityApiType } from '#tracker_api/entities/index.js';

export interface GetEntityDto {
  /** Тип записи Entity API */
  entityType: EntityApiType;

  /** Идентификатор записи */
  entityId: string;

  /**
   * Имена содержательных полей записи для query-параметра `fields` API.
   * Без них ответ приходит без объекта `fields` (см.
   * `tools/api/entities/entity-api-fields.util.ts`).
   */
  entityFields?: readonly string[] | undefined;
}
