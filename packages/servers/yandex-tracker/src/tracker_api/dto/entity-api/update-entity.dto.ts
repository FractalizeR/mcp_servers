/**
 * DTO для обновления записи Entity API (Goal/Project/Portfolio)
 *
 * См. примечание о неполной документированности тела запроса в
 * `create-entity.dto.ts`.
 */

import type { EntityApiType } from '#tracker_api/entities/index.js';

export interface UpdateEntityDto {
  /** Тип записи Entity API */
  entityType: EntityApiType;

  /** Идентификатор записи */
  entityId: string;

  /** Новое название записи (опционально) */
  name?: string | undefined;

  /** Новое описание записи (опционально) */
  description?: string | undefined;

  /** Версия записи для оптимистичной блокировки (опционально) */
  version?: number | undefined;

  /** Дополнительные поля тела запроса, специфичные для entityType (опционально) */
  extraFields?: Record<string, unknown> | undefined;
}
