/**
 * DTO для обновления записи Entity API (Goal/Project/Portfolio)
 *
 * См. примечание о форме тела в `create-entity.dto.ts`: `{ fields: {...} }`,
 * поля `name`/`description` в Entity API не существуют.
 */

import type { EntityApiType } from '#tracker_api/entities/index.js';

export interface UpdateEntityDto {
  /** Тип записи Entity API */
  entityType: EntityApiType;

  /** Идентификатор записи */
  entityId: string;

  /** Версия записи для оптимистичной блокировки (опционально) */
  version?: number | undefined;

  /**
   * Кастомные поля записи, отправляемые в `{ fields: {...} }` (опционально —
   * при пустом PATCH тело можно не слать).
   */
  extraFields?: Record<string, unknown> | undefined;
}
