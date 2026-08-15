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

export class UpdateEntityOperation extends BaseOperation {
  async execute(dto: UpdateEntityDto): Promise<EntityApiOutput> {
    const { entityType, entityId, name, description, version, extraFields } = dto;

    const body: Record<string, unknown> = {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(extraFields ?? {}),
    };

    this.logger.info(`Обновление записи Entity API: ${entityType}/${entityId}`);

    const query = version !== undefined ? `?version=${encodeURIComponent(String(version))}` : '';

    const data = await this.httpClient.patch<unknown>(
      `/v3/entities/${entityType}/${entityId}${query}`,
      body
    );
    return assertEntityRecordShape<EntityApiOutput>(
      data,
      `update_entity ${entityType}/${entityId}`
    );
  }
}
