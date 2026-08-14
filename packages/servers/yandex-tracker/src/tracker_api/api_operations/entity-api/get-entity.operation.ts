/**
 * Операция получения одной записи Entity API (Goal/Project/Portfolio)
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение одной записи по entityType+id
 * - НЕТ поиска/создания/обновления/удаления
 *
 * API: GET /v3/entities/{entityType}/{id}
 *
 * ВАЖНО: не путать с legacy `/v2/projects/{id}` (`GetProjectOperation`) —
 * `entityType='project'` здесь адресует Project ВНУТРИ Entity API, другую
 * коллекцию с другим пространством идентификаторов.
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import type { GetEntityDto } from '#tracker_api/dto/entity-api/index.js';
import type { EntityApiOutput } from '#tracker_api/dto/entity-api/index.js';

export class GetEntityOperation extends BaseOperation {
  async execute(dto: GetEntityDto): Promise<EntityApiOutput> {
    const { entityType, entityId } = dto;
    this.logger.info(`Получение записи Entity API: ${entityType}/${entityId}`);

    return this.httpClient.get<EntityApiOutput>(`/v3/entities/${entityType}/${entityId}`);
  }
}
