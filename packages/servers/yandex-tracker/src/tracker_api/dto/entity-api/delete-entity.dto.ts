/**
 * DTO для удаления записи Entity API (Goal/Project/Portfolio)
 */

import type { EntityApiType } from '#tracker_api/entities/index.js';

export interface DeleteEntityDto {
  /** Тип записи Entity API */
  entityType: EntityApiType;

  /** Идентификатор записи */
  entityId: string;
}
