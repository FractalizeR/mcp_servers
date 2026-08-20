/**
 * Операция обновления записи Entity API (Goal/Project/Portfolio)
 *
 * Ответственность (SRP):
 * - ТОЛЬКО обновление одной записи по entityType+id
 * - НЕТ поиска/получения/создания/удаления
 *
 * API: PATCH /v3/entities/{entityType}/{id}
 *
 * ФОРМА ОТВЕТА: см. `get-entity.operation.ts` — та же оговорка и тот же guard.
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import type { UpdateEntityDto, EntityApiOutput } from '#tracker_api/dto/entity-api/index.js';
import { assertEntityRecordShape } from './assert-entity-record-shape.util.js';
import { buildEntityQuery } from './entity-query.util.js';

export class UpdateEntityOperation extends BaseOperation {
  async execute(dto: UpdateEntityDto): Promise<EntityApiOutput> {
    const { entityType, entityId, version, extraFields, entityFields } = dto;

    // Подтверждено живой пробой: тело — `{ fields: {...} }`, а не name/description.
    const body: Record<string, unknown> = extraFields !== undefined ? { fields: extraFields } : {};

    this.logger.info(`Обновление записи Entity API: ${entityType}/${entityId}`);

    const data = await this.httpClient.patch<unknown>(
      `/v3/entities/${entityType}/${entityId}${buildEntityQuery({ entityFields, version })}`,
      body
    );
    return assertEntityRecordShape<EntityApiOutput>(
      data,
      `update_entity ${entityType}/${entityId}`
    );
  }
}
