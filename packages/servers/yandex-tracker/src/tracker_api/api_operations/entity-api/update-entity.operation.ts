/**
 * Операция обновления записи Entity API (Goal/Project/Portfolio)
 *
 * Ответственность (SRP):
 * - ТОЛЬКО обновление одной записи по entityType+id
 * - НЕТ поиска/получения/создания/удаления
 *
 * API: PATCH /v3/entities/{entityType}/{id}
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import type { UpdateEntityDto, EntityApiOutput } from '#tracker_api/dto/entity-api/index.js';

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

    return this.httpClient.patch<EntityApiOutput>(
      `/v3/entities/${entityType}/${entityId}${query}`,
      body
    );
  }
}
