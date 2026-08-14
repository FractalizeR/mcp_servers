/**
 * Операция удаления записи Entity API (Goal/Project/Portfolio)
 *
 * Ответственность (SRP):
 * - ТОЛЬКО удаление одной записи по entityType+id
 * - НЕТ поиска/получения/создания/обновления
 *
 * API: DELETE /v3/entities/{entityType}/{id}
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import type { DeleteEntityDto } from '#tracker_api/dto/entity-api/index.js';

export class DeleteEntityOperation extends BaseOperation {
  async execute(dto: DeleteEntityDto): Promise<void> {
    const { entityType, entityId } = dto;
    this.logger.info(`Удаление записи Entity API: ${entityType}/${entityId}`);

    await this.httpClient.delete<void>(`/v3/entities/${entityType}/${entityId}`);
  }
}
