/**
 * DTO для получения одной записи Entity API (Goal/Project/Portfolio)
 */

import type { EntityApiType } from '#tracker_api/entities/index.js';

export interface GetEntityDto {
  /** Тип записи Entity API */
  entityType: EntityApiType;

  /** Идентификатор записи */
  entityId: string;
}
